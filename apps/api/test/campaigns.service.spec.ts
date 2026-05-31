import { NotFoundException } from '@nestjs/common';
import { schema } from '@evertrust/db';
import { CampaignsService } from '../src/campaigns/campaigns.service';
import type { AppConfigService } from '../src/config/app-config.service';
import { FakeTable, makeFakeDb } from './fake-db';

const ORG_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const USER = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const WEBHOOK = 'https://evertrustgmbh.app.n8n.cloud/webhook/aim-deploy-campaign';

const DTO = {
  niche: 'LED',
  target: 'EPC',
  country: 'Germany',
  state: 'Berlin',
  project: 'LED Retrofit Berlin 2026',
  gmailLabel: 'LED-Berlin-2026',
  salesCalendarId: 'info@evertrust-germany.de',
  whatsappNumber: '+4915112345678',
};

// Minimal AppConfigService stub — the service only reads N8N_AIM_WEBHOOK_URL.
function makeConfig(webhookUrl: string): AppConfigService {
  return {
    get: (k: string) => (k === 'N8N_AIM_WEBHOOK_URL' ? webhookUrl : ''),
  } as unknown as AppConfigService;
}

function seed(webhookUrl = '') {
  const campaigns = new FakeTable([]);
  const arsenalRuns = new FakeTable([]);
  const { db } = makeFakeDb(
    new Map<unknown, FakeTable>([
      [schema.campaigns, campaigns],
      [schema.arsenalRuns, arsenalRuns],
    ]),
  );
  return {
    service: new CampaignsService(db, makeConfig(webhookUrl)),
    campaigns,
    arsenalRuns,
  };
}

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('CampaignsService — launch (create + AIM deploy)', () => {
  // WHY: ERP-first. The campaign must persist regardless of the webhook outcome,
  // and the server owns organizationId + status. With no webhook configured the
  // deploy is SKIPPED (DRAFT) — the feature is safe before the webhook is set.
  it('persists a DRAFT campaign and skips deploy when no webhook is configured', async () => {
    const { service, campaigns } = seed('');
    const fetchSpy = jest.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const row = await service.create(ORG_A, DTO, USER);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(row.status).toBe('DRAFT');
    expect(row.organizationId).toBe(ORG_A);
    expect(row.niche).toBe('LED');
    expect(row.state).toBe('Berlin');
    expect(row.driveFolderUrl).toBeFalsy();
    expect(campaigns.rows).toHaveLength(1);
  });

  // WHY: a successful AIM deploy is what turns a saved target into a live campaign;
  // the Drive folder ref + decider must be captured for the operator + audit.
  it('fires the AIM webhook and records DEPLOYED + Drive folder on success', async () => {
    const { service } = seed(WEBHOOK);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        folderId: 'F1',
        folderUrl: 'https://drive.google.com/drive/folders/F1',
      }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const row = await service.create(ORG_A, DTO, USER);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(WEBHOOK);
    expect(opts.method).toBe('POST');
    // The 9 AIM inputs are POSTed verbatim (matches the reference form payload).
    expect(JSON.parse(opts.body as string)).toMatchObject({
      niche: 'LED',
      state: 'Berlin',
      // `city` is aliased from `state` so AIM's config.json (which reads body.city)
      // carries the location — otherwise Lead Satellite gets 0 cities and bails.
      city: 'Berlin',
      gmailLabel: 'LED-Berlin-2026',
    });
    expect(row.status).toBe('DEPLOYED');
    expect(row.driveFolderUrl).toBe('https://drive.google.com/drive/folders/F1');
    expect(row.driveFolderId).toBe('F1');
    expect(row.deployedBy).toBe(USER);
    expect(row.deployedAt).toBeInstanceOf(Date);
  });

  // WHY: failure must be OBSERVABLE, not a 500. A bad webhook response records
  // FAILED + the reason so the operator can retry — the launch never throws.
  it('records FAILED + deployError on a non-2xx webhook response', async () => {
    const { service } = seed(WEBHOOK);
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    const row = await service.create(ORG_A, DTO, USER);
    expect(row.status).toBe('FAILED');
    expect(row.deployError).toContain('500');
  });

  it('records FAILED when the webhook call throws (network error)', async () => {
    const { service } = seed(WEBHOOK);
    globalThis.fetch = jest
      .fn()
      .mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;

    const row = await service.create(ORG_A, DTO, USER);
    expect(row.status).toBe('FAILED');
    expect(row.deployError).toContain('ECONNREFUSED');
  });
});

describe('CampaignsService — tenant isolation', () => {
  it('get 404s across orgs and list is scoped to the calling org', async () => {
    const { service } = seed('');
    const a = await service.create(ORG_A, DTO, USER);

    await expect(service.get(ORG_B, a.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(await service.list(ORG_B)).toEqual([]);
    expect((await service.list(ORG_A)).map((r) => r.id)).toEqual([a.id]);
  });
});

describe('CampaignsService — delete', () => {
  // WHY: delete removes the ERP record but must KEEP the arsenal-run log (detach
  // the FK, don't destroy history), and must never cross tenants.
  it('deletes the campaign and detaches its arsenal runs (kept, campaignId nulled)', async () => {
    const { service, campaigns, arsenalRuns } = seed();
    const c = await service.create(ORG_A, DTO, USER);
    arsenalRuns.rows.push({
      id: 'run-1',
      organizationId: ORG_A,
      stage: 'AMMO_FORGE',
      campaignId: c.id,
      source: 'MANUAL',
      status: 'DISPATCHED',
      detail: null,
      triggeredBy: USER,
      createdAt: new Date(),
      __seq: 1,
    });

    const before = await service.delete(ORG_A, c.id);

    expect(before.id).toBe(c.id);
    expect(campaigns.rows).toHaveLength(0);
    // the run is preserved, just detached from the deleted campaign
    expect(arsenalRuns.rows).toHaveLength(1);
    expect(arsenalRuns.rows[0]!.campaignId).toBeNull();
  });

  it('404s deleting a campaign in another org', async () => {
    const { service } = seed();
    const c = await service.create(ORG_A, DTO, USER);
    await expect(service.delete(ORG_B, c.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
