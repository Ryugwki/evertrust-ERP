import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { schema } from '@evertrust/db';
import { UsersService } from '../src/users/users.service';
import { FakeTable, makeFakeDb } from './fake-db';

const ORG_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const ALICE = 'a1111111-1111-1111-1111-111111111111';
const BOB = 'b2222222-2222-2222-2222-222222222222';
const MALLORY = 'c3333333-3333-3333-3333-333333333333';

// Seeds a users table across two orgs. Alice (Super Admin/CEO) + Bob (Employee,
// no dept/position) in ORG_A; Mallory in ORG_B — used to prove tenant isolation.
function seed() {
  const users = new FakeTable([
    {
      id: ALICE,
      organizationId: ORG_A,
      name: 'Alice',
      email: 'alice@evertrust-germany.de',
      role: 'SUPER_ADMIN',
      position: 'CEO',
      department: 'OPERATIONS',
      active: true,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      __seq: 1,
    },
    {
      id: BOB,
      organizationId: ORG_A,
      name: 'Bob',
      email: 'bob@evertrust-germany.de',
      role: 'EMPLOYEE',
      position: null,
      department: null,
      active: true,
      createdAt: new Date('2026-01-02T00:00:00Z'),
      __seq: 2,
    },
    {
      id: MALLORY,
      organizationId: ORG_B,
      name: 'Mallory',
      email: 'mallory@other.de',
      role: 'EMPLOYEE',
      position: null,
      department: null,
      active: true,
      createdAt: new Date('2026-01-03T00:00:00Z'),
      __seq: 3,
    },
  ]);
  const { db } = makeFakeDb(new Map<unknown, FakeTable>([[schema.users, users]]));
  return { service: new UsersService(db), users };
}

describe('UsersService — admin directory (listAllForOrg)', () => {
  it('returns only the calling org users, with createdAt serialized to ISO', async () => {
    const { service } = seed();
    const rows = await service.listAllForOrg(ORG_A);

    expect(rows.map((r) => r.id).sort()).toEqual([ALICE, BOB].sort());
    expect(rows.every((r) => typeof r.createdAt === 'string')).toBe(true);
    // never leaks another tenant's users
    expect(rows.find((r) => r.id === MALLORY)).toBeUndefined();
  });

  it('is empty for an org with no users', async () => {
    const { service } = seed();
    expect(
      await service.listAllForOrg('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
    ).toEqual([]);
  });
});

describe('UsersService — updateUser (role / position / department)', () => {
  it('updates all three fields and returns the prior values as `before`', async () => {
    const { service } = seed();
    const { before, after } = await service.updateUser(ORG_A, ALICE, BOB, {
      role: 'MANAGER',
      position: 'DEPT_MANAGER',
      department: 'IT',
    });

    // toMatchObject (not toEqual): the in-memory fake-db doesn't honor SELECT
    // projections, so `before` carries extra columns at runtime — real Drizzle
    // returns exactly {role, position, department} (enforced by the TS types).
    expect(before).toMatchObject({
      role: 'EMPLOYEE',
      position: null,
      department: null,
    });
    expect(after.role).toBe('MANAGER');
    expect(after.position).toBe('DEPT_MANAGER');
    expect(after.department).toBe('IT');
    expect(typeof after.createdAt).toBe('string');
  });

  it('patches a single field, leaving the others untouched', async () => {
    const { service } = seed();
    const { after } = await service.updateUser(ORG_A, ALICE, ALICE, {
      department: 'BUSINESS',
    });

    expect(after.role).toBe('SUPER_ADMIN'); // unchanged
    expect(after.position).toBe('CEO'); // unchanged
    expect(after.department).toBe('BUSINESS');
  });

  it('clears position/department when set to null (e.g. a CEO with no dept)', async () => {
    const { service } = seed();
    const { after } = await service.updateUser(ORG_A, ALICE, ALICE, {
      position: null,
      department: null,
    });

    expect(after.position).toBeNull();
    expect(after.department).toBeNull();
  });

  it('404s updating a user in another org (tenant-scoped)', async () => {
    const { service } = seed();
    await expect(
      service.updateUser(ORG_A, ALICE, MALLORY, { role: 'ADMIN' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('404s updating a non-existent user', async () => {
    const { service } = seed();
    await expect(
      service.updateUser(ORG_A, ALICE, 'ffffffff-ffff-ffff-ffff-ffffffffffff', {
        role: 'ADMIN',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('UsersService — updateUser guards (Super Admin + deactivation)', () => {
  it("blocks changing a Super Admin's role, but allows other field edits", async () => {
    const { service } = seed();
    await expect(
      service.updateUser(ORG_A, ALICE, ALICE, { role: 'ADMIN' }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    // position/department on a Super Admin are still editable
    const { after } = await service.updateUser(ORG_A, ALICE, ALICE, {
      department: 'IT',
    });
    expect(after.role).toBe('SUPER_ADMIN');
    expect(after.department).toBe('IT');
  });

  it('deactivates a normal user (active=false)', async () => {
    const { service } = seed();
    const { after } = await service.updateUser(ORG_A, ALICE, BOB, {
      active: false,
    });
    expect(after.active).toBe(false);
  });

  it('blocks deactivating your own account', async () => {
    const { service } = seed();
    await expect(
      service.updateUser(ORG_A, BOB, BOB, { active: false }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks deactivating a Super Admin', async () => {
    const { service } = seed();
    await expect(
      service.updateUser(ORG_A, BOB, ALICE, { active: false }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('reactivates a user (active=true) without guard', async () => {
    const { service } = seed();
    const { after } = await service.updateUser(ORG_A, ALICE, BOB, {
      active: true,
    });
    expect(after.active).toBe(true);
  });
});

describe('UsersService — updateUser per-user permissions', () => {
  it('sets an explicit per-user permission override', async () => {
    const { service } = seed();
    const { after } = await service.updateUser(ORG_A, ALICE, BOB, {
      permissions: ['tenders:read', 'campaigns:read'],
    });
    expect(after.permissions).toEqual(['tenders:read', 'campaigns:read']);
  });

  it('resets a user to role defaults (permissions = null)', async () => {
    const { service } = seed();
    const { after } = await service.updateUser(ORG_A, ALICE, BOB, {
      permissions: null,
    });
    expect(after.permissions).toBeNull();
  });

  it('ignores permission edits for a Super Admin (always full)', async () => {
    const { service } = seed();
    // Try to narrow ALICE (Super Admin) — must not be persisted.
    const { after } = await service.updateUser(ORG_A, BOB, ALICE, {
      permissions: ['tenders:read'],
    });
    expect(after.permissions ?? null).toBeNull();
  });

  it('blocks removing your own user-management access', async () => {
    const { service } = seed();
    await expect(
      service.updateUser(ORG_A, BOB, BOB, { permissions: ['tenders:read'] }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
