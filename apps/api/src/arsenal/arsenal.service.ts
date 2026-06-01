import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { schema } from '@evertrust/db';
import {
  ARSENAL_STAGE_META,
  type ArsenalRunSource,
  type ArsenalStage,
} from '@evertrust/shared';
import { DB, type DbClient } from '../db/db.tokens';
import { tenantScope } from '../common/tenant';
import { AppConfigService } from '../config/app-config.service';
import type { Env } from '../config/env.schema';

type CampaignRow = typeof schema.campaigns.$inferSelect;
type ArsenalRunRow = typeof schema.arsenalRuns.$inferSelect;

// ArsenalStage → the env var holding that stage's n8n webhook URL. `as const
// satisfies` keeps the literal key types (so config.get returns string, not the
// whole Env value union) while still checking every value is a real Env key.
const STAGE_WEBHOOK_ENV = {
  LEAD_SATELLITE: 'N8N_LEAD_SATELLITE_WEBHOOK_URL',
  AMMO_FORGE: 'N8N_AMMO_FORGE_WEBHOOK_URL',
  REACH_BAZOOKA: 'N8N_REACH_BAZOOKA_WEBHOOK_URL',
  REPLY_GLOCK: 'N8N_REPLY_GLOCK_WEBHOOK_URL',
  SLEEPER_GRENADE: 'N8N_SLEEPER_GRENADE_WEBHOOK_URL',
} as const satisfies Record<ArsenalStage, keyof Env>;

// The HTTP method each stage's n8n webhook listens on. n8n registers a webhook
// per method+path, so POSTing to a GET-only webhook returns 404. The existing
// Reply Glock / Sleeper manual webhooks are GET ("Workflow got started"); AIM /
// Lead Satellite / Ammo Forge are POST. Bazooka has no webhook yet (GET to match
// the others' pattern once one is added).
const STAGE_METHOD: Record<ArsenalStage, 'GET' | 'POST'> = {
  LEAD_SATELLITE: 'POST',
  AMMO_FORGE: 'POST',
  REACH_BAZOOKA: 'GET',
  REPLY_GLOCK: 'GET',
  SLEEPER_GRENADE: 'GET',
};

// Fires an arsenal stage's n8n webhook ("Run now" + the daily scheduler) and
// records the hand-off in arsenal_runs. ERP-first + observable: the webhook call
// is best-effort and the ERP owns only the hand-off (DISPATCHED) — n8n then runs
// async. The run row is written for BOTH success and failure so every trigger is
// visible. A non-2xx / network error records FAILED rather than 500-ing.
@Injectable()
export class ArsenalService {
  constructor(
    @Inject(DB) private readonly db: DbClient,
    private readonly config: AppConfigService,
  ) {}

  // Recent arsenal runs visible to the caller's org PLUS global (scheduled) runs,
  // which carry no org. Newest-first, capped. (Low volume; filtered in-process to
  // keep the org-OR-null scope simple.)
  async listRuns(orgId: string): Promise<ArsenalRunRow[]> {
    const rows = await this.db
      .select()
      .from(schema.arsenalRuns)
      .orderBy(desc(schema.arsenalRuns.createdAt));
    return rows
      .filter((r) => r.organizationId === orgId || r.organizationId === null)
      .slice(0, 50);
  }

  // The org's Growth-Engine settings (the editable daily Bazooka time + timezone).
  // Defaults to off (null) when no row exists yet.
  async getSettings(
    orgId: string,
  ): Promise<{ bazookaDailyAt: string | null; bazookaTimezone: string | null }> {
    const rows = await this.db
      .select()
      .from(schema.arsenalSettings)
      .where(eq(schema.arsenalSettings.organizationId, orgId))
      .limit(1);
    return {
      bazookaDailyAt: rows[0]?.bazookaDailyAt ?? null,
      bazookaTimezone: rows[0]?.bazookaTimezone ?? null,
    };
  }

  // Upsert the org's daily Bazooka time + timezone (time null = off). Returns the
  // saved values.
  async updateSettings(
    orgId: string,
    input: { bazookaDailyAt: string | null; bazookaTimezone: string | null },
    userId: string,
  ): Promise<{ bazookaDailyAt: string | null; bazookaTimezone: string | null }> {
    const { bazookaDailyAt, bazookaTimezone } = input;
    const existing = await this.db
      .select()
      .from(schema.arsenalSettings)
      .where(eq(schema.arsenalSettings.organizationId, orgId))
      .limit(1);

    if (existing[0]) {
      await this.db
        .update(schema.arsenalSettings)
        .set({
          bazookaDailyAt,
          bazookaTimezone,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(schema.arsenalSettings.id, existing[0].id));
    } else {
      await this.db.insert(schema.arsenalSettings).values({
        organizationId: orgId,
        bazookaDailyAt,
        bazookaTimezone,
        updatedBy: userId,
      });
    }
    return { bazookaDailyAt, bazookaTimezone };
  }

  // Every org that has a daily Bazooka time set — the scheduler arms one timer per
  // row on boot (each interpreted in its saved timezone).
  async settingsWithDailyTime(): Promise<
    {
      organizationId: string;
      bazookaDailyAt: string;
      bazookaTimezone: string | null;
    }[]
  > {
    const rows = await this.db
      .select()
      .from(schema.arsenalSettings)
      .where(isNotNull(schema.arsenalSettings.bazookaDailyAt));
    return rows
      .filter((r) => r.bazookaDailyAt !== null)
      .map((r) => ({
        organizationId: r.organizationId,
        bazookaDailyAt: r.bazookaDailyAt as string,
        bazookaTimezone: r.bazookaTimezone ?? null,
      }));
  }

  // Fire a stage. PER_CAMPAIGN stages require a campaignId (and send that
  // campaign's context); GLOBAL stages take none. orgId is null only for the
  // scheduler's GLOBAL runs. 400 if the stage isn't configured / a PER_CAMPAIGN
  // stage is missing its campaign; 404 if the campaign is cross-org.
  async run(
    orgId: string | null,
    stage: ArsenalStage,
    opts: { campaignId?: string; source: ArsenalRunSource; userId?: string | null },
  ): Promise<ArsenalRunRow> {
    const meta = ARSENAL_STAGE_META[stage];
    let campaignId: string | null = null;
    let payload: Record<string, unknown>;

    // A campaign was chosen (a targeted run from a campaign) → send that
    // campaign's context. Otherwise it's a global run (e.g. the Arsenal panel) —
    // fire the stage's webhook with no campaign; n8n processes across campaigns.
    if (opts.campaignId) {
      if (!orgId) {
        throw new BadRequestException('A campaign-scoped run needs a tenant.');
      }
      const campaign = await this.requireCampaign(orgId, opts.campaignId);
      campaignId = campaign.id;
      payload = { stage, campaign: this.campaignPayload(campaign) };
    } else {
      payload = { stage, source: 'erp' };
    }

    const webhookUrl = this.config.get(STAGE_WEBHOOK_ENV[stage]);
    if (!webhookUrl) {
      throw new BadRequestException(
        `${meta.label} is not wired up yet — set ${STAGE_WEBHOOK_ENV[stage]} (and add a Webhook trigger to the n8n workflow).`,
      );
    }

    const outcome = await this.fire(webhookUrl, STAGE_METHOD[stage], payload);

    const inserted = await this.db
      .insert(schema.arsenalRuns)
      .values({
        organizationId: orgId,
        stage,
        campaignId,
        source: opts.source,
        status: outcome.status,
        detail: outcome.detail,
        triggeredBy: opts.userId ?? null,
      })
      .returning();

    const row = inserted[0];
    if (!row) throw new Error('Failed to record arsenal run');
    return row;
  }

  // Record an autonomous n8n run reported back via the callback (source N8N). This
  // is the n8n→ERP writeback: n8n runs a stage on its own schedule / Drive poll and
  // POSTs the FINAL outcome here so it shows in the per-campaign Live activity feed.
  // The campaign (and its org) is resolved from the ERP campaignId OR the Drive
  // folder id n8n knows natively; neither given = a global stage (org/campaign null).
  // No JWT here — the controller gates this on the shared ingest token. Cross-org
  // by design: the token is the trust boundary; the run is attributed to the
  // campaign's own org. 404 if a given campaignId / driveFolderId matches nothing.
  async recordCallback(input: {
    stage: ArsenalStage;
    status: 'SUCCESS' | 'ERROR';
    campaignId?: string;
    driveFolderId?: string;
    detail?: string;
  }): Promise<{ id: string }> {
    let campaign: CampaignRow | null = null;
    if (input.campaignId) {
      const rows = await this.db
        .select()
        .from(schema.campaigns)
        .where(eq(schema.campaigns.id, input.campaignId))
        .limit(1);
      campaign = rows[0] ?? null;
      if (!campaign) {
        throw new NotFoundException(
          `No campaign for campaignId ${input.campaignId}`,
        );
      }
    } else if (input.driveFolderId) {
      const rows = await this.db
        .select()
        .from(schema.campaigns)
        .where(eq(schema.campaigns.driveFolderId, input.driveFolderId))
        .limit(1);
      campaign = rows[0] ?? null;
      if (!campaign) {
        throw new NotFoundException(
          `No campaign for driveFolderId ${input.driveFolderId}`,
        );
      }
    }

    const inserted = await this.db
      .insert(schema.arsenalRuns)
      .values({
        organizationId: campaign?.organizationId ?? null,
        stage: input.stage,
        campaignId: campaign?.id ?? null,
        source: 'N8N',
        status: input.status,
        detail: input.detail ?? null,
        triggeredBy: null,
      })
      .returning();

    const row = inserted[0];
    if (!row) throw new Error('Failed to record arsenal callback');
    return { id: row.id };
  }

  // Hit the stage webhook with its configured method; map the outcome to a run
  // status + detail. GET webhooks just trigger the workflow (no body); POST ones
  // carry the JSON payload (campaign context).
  private async fire(
    webhookUrl: string,
    method: 'GET' | 'POST',
    payload: Record<string, unknown>,
  ): Promise<{ status: 'DISPATCHED' | 'FAILED'; detail: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const res = await fetch(webhookUrl, {
        method,
        headers:
          method === 'GET' ? undefined : { 'Content-Type': 'application/json' },
        body: method === 'GET' ? undefined : JSON.stringify(payload),
        signal: controller.signal,
      });
      return res.ok
        ? { status: 'DISPATCHED', detail: `HTTP ${res.status}` }
        : { status: 'FAILED', detail: `webhook HTTP ${res.status}` };
    } catch (err) {
      return {
        status: 'FAILED',
        detail: err instanceof Error ? err.message : 'webhook call failed',
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  // Load a campaign within the org, or 404.
  private async requireCampaign(
    orgId: string,
    campaignId: string,
  ): Promise<CampaignRow> {
    const rows = await this.db
      .select()
      .from(schema.campaigns)
      .where(
        and(
          tenantScope(orgId, schema.campaigns),
          eq(schema.campaigns.id, campaignId),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException('Campaign not found');
    return row;
  }

  // The campaign context PER_CAMPAIGN stages receive (the AIM inputs + Drive refs).
  private campaignPayload(c: CampaignRow) {
    return {
      campaignId: c.id,
      name: c.name,
      niche: c.niche,
      target: c.target,
      country: c.country,
      state: c.state,
      project: c.project,
      gmailLabel: c.gmailLabel,
      salesCalendarId: c.salesCalendarId,
      whatsappNumber: c.whatsappNumber,
      driveFolderId: c.driveFolderId,
      driveFolderUrl: c.driveFolderUrl,
    };
  }
}
