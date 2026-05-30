import { BadRequestException, NotFoundException } from '@nestjs/common';
import { schema } from '@evertrust/db';
import { TendersService } from '../src/tenders/tenders.service';
import { FakeTable, makeFakeDb } from './fake-db';

const ORG_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const T_A = 'a1111111-1111-1111-1111-111111111111';
const T_B = 'b2222222-2222-2222-2222-222222222222';

// Seed: one tender in org A (PIC_PRICING) and one in org B (NOT_STARTED). Each
// row carries a __seq for deterministic newest-first ordering.
function seededService() {
  const tenders = new FakeTable([
    {
      id: T_A,
      organizationId: ORG_A,
      vergabeId: 'EXT-A',
      source: 'PORTAL',
      title: 'Org A tender',
      status: 'PIC_PRICING',
      currency: 'EUR',
      isAboveThreshold: false,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
      __seq: 1,
    },
    {
      id: T_B,
      organizationId: ORG_B,
      vergabeId: 'EXT-B',
      source: 'PORTAL',
      title: 'Org B tender',
      status: 'NOT_STARTED',
      currency: 'EUR',
      isAboveThreshold: false,
      createdAt: new Date('2026-01-02T00:00:00Z'),
      updatedAt: new Date('2026-01-02T00:00:00Z'),
      __seq: 2,
    },
  ]);
  const { db } = makeFakeDb(new Map([[schema.tenders, tenders]]));
  return { service: new TendersService(db), tenders };
}

describe('TendersService — tenant isolation', () => {
  // WHY: tenancy is the security boundary. Org A reading Org B's tender must be
  // indistinguishable from "missing" (404), never a leak.
  it('get() throws NotFound for a tender owned by another org', async () => {
    const { service } = seededService();
    await expect(service.get(ORG_A, T_B)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('get() returns the tender for its owning org', async () => {
    const { service } = seededService();
    const row = await service.get(ORG_A, T_A);
    expect(row.id).toBe(T_A);
    expect(row.organizationId).toBe(ORG_A);
  });

  it('list() only returns the calling org rows', async () => {
    const { service } = seededService();
    const rows = await service.list(ORG_A);
    expect(rows.map((r) => r.id)).toEqual([T_A]);
  });

  it('transition() on another org tender throws NotFound (no cross-org write)', async () => {
    const { service } = seededService();
    await expect(service.transition(ORG_A, T_B, 'PIC_PRICING')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('TendersService — list status filter', () => {
  // WHY: GET /tenders?status= must filter inside the tenant, not across it.
  it('filters by status', async () => {
    const { service } = seededService();
    expect(await service.list(ORG_A, 'PIC_PRICING')).toHaveLength(1);
    expect(await service.list(ORG_A, 'AWARDED')).toHaveLength(0);
  });
});

describe('TendersService — create', () => {
  // WHY: the server, not the client, owns organizationId and the initial status.
  it('stamps organizationId and status=NOT_STARTED on create', async () => {
    const { service } = seededService();
    const created = await service.create(ORG_A, {
      vergabeId: 'NEW-1',
      source: 'PORTAL',
      title: 'Fresh tender',
    });
    expect(created.organizationId).toBe(ORG_A);
    expect(created.status).toBe('NOT_STARTED');
    expect(created.title).toBe('Fresh tender');
  });
});

describe('TendersService — transition state machine', () => {
  // WHY: legal moves must persist; illegal moves must 400 and NOT mutate state.
  // T_A starts in PIC_PRICING.
  it('performs a legal transition (PIC_PRICING -> CUSTOMER_PRICING)', async () => {
    const { service } = seededService();
    const { before, after } = await service.transition(
      ORG_A,
      T_A,
      'CUSTOMER_PRICING',
    );
    expect(before.status).toBe('PIC_PRICING');
    expect(after.status).toBe('CUSTOMER_PRICING');
  });

  it('rejects an illegal transition (PIC_PRICING -> AWARDED) with BadRequest', async () => {
    const { service } = seededService();
    await expect(service.transition(ORG_A, T_A, 'AWARDED')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    // state unchanged after the rejected transition
    expect((await service.get(ORG_A, T_A)).status).toBe('PIC_PRICING');
  });
});
