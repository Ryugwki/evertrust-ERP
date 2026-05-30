import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS,
  type Permission,
  permissionsForRole,
} from '@evertrust/shared';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';
import type { AuthUser } from '../src/auth/auth.types';

// Build a minimal ExecutionContext whose request carries the given principal.
function contextWithUser(user: AuthUser | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

// A Reflector stub that returns a fixed @RequirePermissions(...) value.
function reflectorReturning(perms: Permission[] | undefined): Reflector {
  return {
    getAllAndOverride: () => perms,
  } as unknown as Reflector;
}

const L1: AuthUser = { id: 'u1', role: 'L1', organizationId: 'org1' };
const L5: AuthUser = { id: 'u2', role: 'L5', organizationId: 'org1' };

// WHY: permission-based RBAC is the single authorization control. A guard that
// lets a role through without the required permission (or blocks one that has
// it) is a real authz bug — these tests fail the instant that expansion/check
// logic regresses.
describe('PermissionsGuard', () => {
  it('allows when the role holds the required permission (L1 -> admin:config)', () => {
    const guard = new PermissionsGuard(reflectorReturning(['admin:config']));
    expect(guard.canActivate(contextWithUser(L1))).toBe(true);
  });

  it('denies when the role lacks the required permission (L5 -> admin:config)', () => {
    const guard = new PermissionsGuard(reflectorReturning(['admin:config']));
    expect(() => guard.canActivate(contextWithUser(L5))).toThrow(
      ForbiddenException,
    );
  });

  it('requires ALL listed permissions (L5 has tenders:read but not pricing:approve)', () => {
    const guard = new PermissionsGuard(
      reflectorReturning(['tenders:read', 'pricing:approve']),
    );
    expect(() => guard.canActivate(contextWithUser(L5))).toThrow(
      ForbiddenException,
    );
  });

  it('denies when there is no authenticated principal', () => {
    const guard = new PermissionsGuard(reflectorReturning(['admin:config']));
    expect(() => guard.canActivate(contextWithUser(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('allows any authenticated user when no @RequirePermissions is declared', () => {
    const guard = new PermissionsGuard(reflectorReturning(undefined));
    expect(guard.canActivate(contextWithUser(L5))).toBe(true);
  });
});

// WHY: ROLE_PERMISSIONS is the source of truth the guard expands. L1 must be
// a superuser — if any permission is ever added but not granted to L1, that
// is a misconfiguration this test catches.
describe('permissionsForRole', () => {
  it('grants L1 every defined permission', () => {
    const l1Perms = permissionsForRole('L1');
    for (const perm of PERMISSIONS) {
      expect(l1Perms).toContain(perm);
    }
    expect(l1Perms).toHaveLength(PERMISSIONS.length);
  });

  it('returns a copy that cannot mutate the shared mapping', () => {
    const a = permissionsForRole('L5');
    a.push('admin:config');
    expect(permissionsForRole('L5')).not.toContain('admin:config');
  });
});
