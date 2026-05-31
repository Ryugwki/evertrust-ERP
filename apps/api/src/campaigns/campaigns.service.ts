import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { schema } from '@evertrust/db';
import type { CreateCampaignDto } from '@evertrust/shared';
import { DB, type DbClient } from '../db/db.tokens';
import { tenantScope } from '../common/tenant';
import { AppConfigService } from '../config/app-config.service';

type CampaignRow = typeof schema.campaigns.$inferSelect;
type CampaignPatch = Partial<typeof schema.campaigns.$inferInsert>;

// Shape of the AIM "deploy campaign" n8n webhook response (its Respond OK node
// returns { success, folderId, folderUrl, fileId, fileUrl }).
interface AimDeployResult {
  success?: boolean;
  folderId?: string;
  folderUrl?: string;
}

// Growth Engine. Persists the campaign (the AIM target) and fires the AIM n8n
// webhook server-side (ERP-first: Workflow ← API ← DB ← Audit). The webhook call
// is best-effort and NEVER throws out of create() — a failed deploy is recorded as
// FAILED + deployError so the operator sees it, instead of 500-ing the launch.
@Injectable()
export class CampaignsService {
  constructor(
    @Inject(DB) private readonly db: DbClient,
    private readonly config: AppConfigService,
  ) {}

  // The tenant's campaigns, newest-first.
  async list(orgId: string): Promise<CampaignRow[]> {
    return this.db
      .select()
      .from(schema.campaigns)
      .where(tenantScope(orgId, schema.campaigns))
      .orderBy(desc(schema.campaigns.createdAt));
  }

  // One campaign within the tenant. 404 if missing or in another org.
  async get(orgId: string, id: string): Promise<CampaignRow> {
    const rows = await this.db
      .select()
      .from(schema.campaigns)
      .where(
        and(tenantScope(orgId, schema.campaigns), eq(schema.campaigns.id, id)),
      )
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException('Campaign not found');
    return row;
  }

  // Launch ("Lock & Load"): persist the campaign, then deploy via the AIM webhook
  // if one is configured. Server owns organizationId, status, and the deploy
  // result; the client only supplies the 9 AIM inputs.
  async create(
    orgId: string,
    dto: CreateCampaignDto,
    userId: string,
  ): Promise<CampaignRow> {
    const inserted = await this.db
      .insert(schema.campaigns)
      .values({
        organizationId: orgId,
        name: dto.name ?? null,
        niche: dto.niche,
        target: dto.target,
        country: dto.country,
        state: dto.state,
        project: dto.project,
        gmailLabel: dto.gmailLabel,
        salesCalendarId: dto.salesCalendarId,
        whatsappNumber: dto.whatsappNumber,
        status: 'DRAFT',
      })
      .returning();

    let row = inserted[0];
    if (!row) throw new Error('Failed to create campaign');

    // No webhook configured → persist as DRAFT (deploy skipped). Mirrors the
    // reference "leave blank to skip the deploy step" behavior.
    const webhookUrl = this.config.get('N8N_AIM_WEBHOOK_URL');
    if (!webhookUrl) return row;

    const patch = await this.runAimDeploy(webhookUrl, dto, userId);
    const updated = await this.db
      .update(schema.campaigns)
      .set(patch)
      .where(eq(schema.campaigns.id, row.id))
      .returning();
    row = updated[0] ?? row;
    return row;
  }

  // Delete a campaign (ERP record only — the Google Drive folder + leads are NOT
  // touched; the ERP has no Drive write path). Detaches any arsenal_runs first
  // (clears the FK, keeps the trigger log) so the delete can't violate the
  // foreign key. 404 if missing or in another org. Returns the deleted row for audit.
  async delete(orgId: string, id: string): Promise<CampaignRow> {
    const before = await this.get(orgId, id);

    await this.db
      .update(schema.arsenalRuns)
      .set({ campaignId: null })
      .where(eq(schema.arsenalRuns.campaignId, id));

    await this.db
      .delete(schema.campaigns)
      .where(
        and(tenantScope(orgId, schema.campaigns), eq(schema.campaigns.id, id)),
      );

    return before;
  }

  // POST the AIM payload to the n8n webhook; return the column patch reflecting the
  // outcome (DEPLOYED + Drive folder refs, or FAILED + error). Pure I/O, no throw.
  private async runAimDeploy(
    webhookUrl: string,
    dto: CreateCampaignDto,
    userId: string,
  ): Promise<CampaignPatch> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      // AIM's "Write config.json" node reads body.city, but our form field is
      // `state`. Send `city` too (= state) so the campaign's config.json carries
      // the location. Without it, Lead Satellite's "Build Search Query" gets 0
      // cities and bails (returns []), so the funnel produces no leads.
      const aimPayload = { ...dto, city: dto.state };
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aimPayload),
        signal: controller.signal,
      });
      if (!res.ok) {
        return { status: 'FAILED', deployError: `AIM webhook HTTP ${res.status}` };
      }
      const data = (await res
        .json()
        .catch(() => ({}))) as AimDeployResult;
      return {
        status: 'DEPLOYED',
        driveFolderId: data.folderId ?? null,
        driveFolderUrl: data.folderUrl ?? null,
        deployError: null,
        deployedBy: userId,
        deployedAt: new Date(),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AIM webhook call failed';
      return { status: 'FAILED', deployError: msg };
    } finally {
      clearTimeout(timeout);
    }
  }
}
