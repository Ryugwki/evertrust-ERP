import type { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { schema } from '@evertrust/db';
import { MeetingsService } from '../src/meetings/meetings.service';
import { FakeTable, makeFakeDb } from './fake-db';

const ORG = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function svc() {
  const meetings = new FakeTable([
    {
      id: 'm1',
      organizationId: ORG,
      sessionId: 's1',
      clientCompany: 'Kodeca',
      aeName: 'Hanna',
      clientContact: 'Vic',
      clientEmail: 'vic@kodeca.de',
      persona: 'Alex Hormozi',
      score: 65,
      campaignId: 'c1',
      matchMethod: 'email',
      analysis: { overall_summary: 'x' },
      meetingDate: '2026-06-03',
      createdAt: new Date('2026-06-03T00:00:00Z'),
      __seq: 2,
    },
    {
      id: 'm2',
      organizationId: ORG,
      sessionId: 's2',
      clientCompany: 'Rhein-Main Logistik',
      aeName: 'Lena',
      clientContact: 'Stefan',
      clientEmail: 's.adler@rm.de',
      persona: 'Alex Hormozi',
      score: 42,
      campaignId: null,
      matchMethod: null,
      analysis: {},
      meetingDate: '2026-05-28',
      createdAt: new Date('2026-05-28T00:00:00Z'),
      __seq: 1,
    },
  ]);
  const campaigns = new FakeTable([
    { id: 'c1', organizationId: ORG, name: 'LED Retrofit Berlin 2026' },
  ]);
  const { db } = makeFakeDb(
    new Map<unknown, FakeTable>([
      [schema.meetings, meetings],
      [schema.campaigns, campaigns],
    ]),
  );
  const config = { get: () => '' } as unknown as ConfigService;
  return { service: new MeetingsService(db, config), meetings };
}

describe('MeetingsService.list', () => {
  it('returns all meetings (newest first) with the campaign name joined', async () => {
    const { service } = svc();
    const r = await service.list(ORG);
    expect(r.map((x) => x.id)).toEqual(['m1', 'm2']);
    expect(r[0]!.campaignName).toBe('LED Retrofit Berlin 2026');
    expect(r[1]!.campaignName).toBeNull();
  });

  it('filters to Unattributed', async () => {
    const { service } = svc();
    const r = await service.list(ORG, { campaignId: 'none' });
    expect(r.map((x) => x.id)).toEqual(['m2']);
  });

  it('filters by campaign and by search', async () => {
    const { service } = svc();
    expect((await service.list(ORG, { campaignId: 'c1' })).map((x) => x.id)).toEqual(['m1']);
    expect((await service.list(ORG, { search: 'rhein' })).map((x) => x.id)).toEqual(['m2']);
    expect((await service.list(ORG, { ae: 'Hanna' })).map((x) => x.id)).toEqual(['m1']);
  });
});

describe('MeetingsService.link', () => {
  it('links a meeting to a campaign (manual) and returns the name', async () => {
    const { service } = svc();
    const m = await service.link(ORG, 'm2', 'c1');
    expect(m.campaignId).toBe('c1');
    expect(m.matchMethod).toBe('manual');
    expect(m.campaignName).toBe('LED Retrofit Berlin 2026');
  });

  it('404s for an unknown meeting', async () => {
    const { service } = svc();
    await expect(service.link(ORG, 'nope', 'c1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
