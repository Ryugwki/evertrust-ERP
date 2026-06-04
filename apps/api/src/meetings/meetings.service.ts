import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, asc, desc, eq } from 'drizzle-orm';
import { schema } from '@evertrust/db';
import type {
  MeetingDto,
  MeetingMatchMethod,
  MeetingSyncResultDto,
} from '@evertrust/shared';
import { DB, type DbClient } from '../db/db.tokens';
import { tenantScope } from '../common/tenant';
import { extractMeeting, type RunData } from './meetings.extract';

// The live Sales Agent workflow (Hormozi coach). Reused N8N_API_URL/KEY config.
const SALES_AGENT_WORKFLOW_ID = 'sgQ2Nqa8MZgn0wdp';
const SCAN_LIMIT = 40;
const REQUEST_TIMEOUT_MS = 15000;
// Synced analyses are produced by the workflow's hardcoded coach.
const WORKFLOW_PERSONA = 'Alex Hormozi';

export interface MeetingFilters {
  campaignId?: string; // a campaign id, or 'none' for Unattributed
  ae?: string;
  persona?: string;
  search?: string;
  bucket?: string; // 'week' | 'month' | 'all'
}

interface ExecSummary {
  id: string;
}
interface LeadLite {
  id: string;
  email: string | null;
  website: string | null;
  campaignId: string | null;
}
interface Resolved {
  campaignId: string | null;
  leadId: string | null;
  match: MeetingMatchMethod | null;
}

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);
  constructor(
    @Inject(DB) private readonly db: DbClient,
    private readonly config: ConfigService,
  ) {}

  // The org's meetings, newest first, with the campaign name joined in JS and
  // the remaining filters applied in memory (per-org volume is small).
  async list(orgId: string, filters: MeetingFilters = {}): Promise<MeetingDto[]> {
    const rows = await this.db
      .select()
      .from(schema.meetings)
      .where(tenantScope(orgId, schema.meetings))
      .orderBy(desc(schema.meetings.createdAt));

    const camps = await this.db
      .select({ id: schema.campaigns.id, name: schema.campaigns.name })
      .from(schema.campaigns)
      .where(tenantScope(orgId, schema.campaigns));
    const nameById = new Map(camps.map((c) => [c.id, c.name]));

    const q = (filters.search ?? '').trim().toLowerCase();
    const now = Date.now();
    const cutoff =
      filters.bucket === 'week'
        ? now - 7 * 864e5
        : filters.bucket === 'month'
          ? now - 30 * 864e5
          : null;

    return rows
      .filter((r) => {
        if (filters.campaignId === 'none' && r.campaignId) return false;
        if (
          filters.campaignId &&
          filters.campaignId !== 'none' &&
          r.campaignId !== filters.campaignId
        )
          return false;
        if (filters.ae && r.aeName !== filters.ae) return false;
        if (filters.persona && r.persona !== filters.persona) return false;
        if (cutoff !== null) {
          const t = new Date(r.meetingDate ?? r.createdAt).getTime();
          if (Number.isFinite(t) && t < cutoff) return false;
        }
        if (q) {
          const hay = [r.clientCompany, r.aeName, r.clientContact, r.clientEmail]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .map((r) => this.toDto(r, nameById));
  }

  // Manual campaign link (null clears it). Marks matchMethod 'manual'.
  async link(
    orgId: string,
    id: string,
    campaignId: string | null,
  ): Promise<MeetingDto> {
    const scope = and(
      tenantScope(orgId, schema.meetings),
      eq(schema.meetings.id, id),
    );
    const rows = await this.db
      .update(schema.meetings)
      .set({
        campaignId,
        matchMethod: campaignId ? 'manual' : null,
        updatedAt: new Date(),
      })
      .where(scope)
      .returning();
    const row = rows[0];
    if (!row) throw new NotFoundException('Meeting not found');
    const camps = await this.db
      .select({ id: schema.campaigns.id, name: schema.campaigns.name })
      .from(schema.campaigns)
      .where(tenantScope(orgId, schema.campaigns));
    return this.toDto(row, new Map(camps.map((c) => [c.id, c.name])));
  }

  // Pull recent Sales-Agent executions from n8n, extract each meeting, resolve
  // its campaign (email → lead → campaignId), and upsert by (org, sessionId).
  async sync(orgId: string): Promise<MeetingSyncResultDto> {
    const base = this.config.get('N8N_API_URL').trim().replace(/\/+$/, '');
    const key = this.config.get('N8N_API_KEY').trim();
    if (!base || !key) {
      return { configured: false, scanned: 0, imported: 0, attributed: 0 };
    }

    const leadRows: LeadLite[] = await this.db
      .select({
        id: schema.leads.id,
        email: schema.leads.email,
        website: schema.leads.website,
        campaignId: schema.leads.campaignId,
      })
      .from(schema.leads)
      .where(tenantScope(orgId, schema.leads));

    const execs = await this.listExecutions(base, key);
    let scanned = 0;
    let imported = 0;
    let attributed = 0;

    for (const ex of execs) {
      scanned++;
      const rd = await this.fetchRunData(base, key, ex.id);
      if (!rd) continue;
      const m = extractMeeting(rd);
      if (!m || !m.sessionId) continue; // need a session id to dedup
      const resolved = this.resolve(m.clientEmail, leadRows);
      if (resolved.campaignId) attributed++;

      const existing = (
        await this.db
          .select()
          .from(schema.meetings)
          .where(
            and(
              tenantScope(orgId, schema.meetings),
              eq(schema.meetings.sessionId, m.sessionId),
            ),
          )
          .limit(1)
      )[0];

      const fields = {
        title: m.title,
        clientCompany: m.clientCompany,
        aeName: m.aeName,
        clientContact: m.clientContact,
        clientEmail: m.clientEmail,
        meetingDate: m.meetingDate,
        persona: WORKFLOW_PERSONA,
        analysis: m.analysis,
        docUrl: m.docUrl,
        score: m.score,
      };

      if (existing) {
        // Preserve a manual campaign link across re-syncs.
        const keepManual = existing.matchMethod === 'manual';
        await this.db
          .update(schema.meetings)
          .set({
            ...fields,
            ...(keepManual
              ? {}
              : {
                  campaignId: resolved.campaignId,
                  leadId: resolved.leadId,
                  matchMethod: resolved.match,
                }),
            updatedAt: new Date(),
          })
          .where(eq(schema.meetings.id, existing.id));
      } else {
        await this.db.insert(schema.meetings).values({
          organizationId: orgId,
          sessionId: m.sessionId,
          ...fields,
          campaignId: resolved.campaignId,
          leadId: resolved.leadId,
          matchMethod: resolved.match,
        });
        imported++;
      }
    }
    return { configured: true, scanned, imported, attributed };
  }

  // email → lead.campaignId (exact), else domain match, else unattributed.
  private resolve(
    email: string | null,
    leads: LeadLite[],
  ): Resolved {
    if (!email) return { campaignId: null, leadId: null, match: null };
    const e = email.toLowerCase();
    const exact = leads.find((l) => (l.email ?? '').toLowerCase() === e);
    if (exact?.campaignId) {
      return { campaignId: exact.campaignId, leadId: exact.id, match: 'email' };
    }
    const domain = e.split('@')[1] ?? '';
    if (domain) {
      const byDomain = leads.find(
        (l) =>
          l.campaignId &&
          (((l.email ?? '').split('@')[1] ?? '') === domain ||
            (l.website ?? '').toLowerCase().includes(domain)),
      );
      if (byDomain) {
        return {
          campaignId: byDomain.campaignId,
          leadId: byDomain.id,
          match: 'domain',
        };
      }
    }
    // Found the person but their lead carries no campaign — link the lead only.
    if (exact) return { campaignId: null, leadId: exact.id, match: 'email' };
    return { campaignId: null, leadId: null, match: null };
  }

  private toDto(
    r: typeof schema.meetings.$inferSelect,
    nameById: Map<string, string | null>,
  ): MeetingDto {
    return {
      id: r.id,
      sessionId: r.sessionId,
      title: r.title,
      clientCompany: r.clientCompany,
      aeName: r.aeName,
      clientContact: r.clientContact,
      clientEmail: r.clientEmail,
      meetingDate: r.meetingDate,
      persona: r.persona,
      analysis: r.analysis ?? null,
      docUrl: r.docUrl,
      score: r.score,
      campaignId: r.campaignId,
      campaignName: r.campaignId ? (nameById.get(r.campaignId) ?? null) : null,
      leadId: r.leadId,
      matchMethod: (r.matchMethod as MeetingMatchMethod | null) ?? null,
      createdAt: new Date(r.createdAt).toISOString(),
    };
  }

  // ---- n8n REST helpers (mirrors the arsenal backfill) ----
  private async listExecutions(
    base: string,
    key: string,
  ): Promise<ExecSummary[]> {
    const json = await this.fetchJson(
      `${base}/api/v1/executions?workflowId=${encodeURIComponent(SALES_AGENT_WORKFLOW_ID)}&limit=${SCAN_LIMIT}`,
      key,
    );
    const data = (json as { data?: ExecSummary[] } | null)?.data;
    return Array.isArray(data) ? data : [];
  }

  private async fetchRunData(
    base: string,
    key: string,
    execId: string,
  ): Promise<RunData | null> {
    const json = await this.fetchJson(
      `${base}/api/v1/executions/${encodeURIComponent(execId)}?includeData=true`,
      key,
    );
    const rd = (json as { data?: { resultData?: { runData?: RunData } } } | null)
      ?.data?.resultData?.runData;
    return rd && typeof rd === 'object' ? rd : null;
  }

  private async fetchJson(url: string, key: string): Promise<unknown | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: { 'X-N8N-API-KEY': key, accept: 'application/json' },
        signal: controller.signal,
      });
      if (!res.ok) {
        this.logger.warn(`meetings sync GET ${url}: HTTP ${res.status}`);
        return null;
      }
      return (await res.json()) as unknown;
    } catch (err) {
      this.logger.warn(
        `meetings sync GET failed: ${err instanceof Error ? err.message : 'error'}`,
      );
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
