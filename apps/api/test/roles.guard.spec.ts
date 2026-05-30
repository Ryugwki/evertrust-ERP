import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@evertrust/shared';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import type { AuthUser } from '../src/auth/auth.types';

// Build a minimal ExecutionContext whose request carries the given principal.
function contextWithUser(user: AuthUser | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

// A Reflector stub that returns a fixed @Roles(...) value for any lookup.
function reflectorReturning(roles: UserRole[] | undefined): Reflector {
  return {
    getAllAndOverride: () => roles,
  } as unknown as Reflector;
}

// WHY: RBAC is a security control. A guard that lets the wrong role through (or
// blocks the right one) is a real authz bug — these tests fail the moment that
// comparison logic regresses.
describe('RolesGuard', () => {
  it('denies a principal whose role is not in the required set', () => {
    const guard = new RolesGuard(reflectorReturning(['ADMIN']));
    const ctx = contextWithUser({ id: 'u1', role: 'PIC' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows a principal whose role matches the required set', () => {
    const guard = new RolesGuard(reflectorReturning(['ADMIN']));
    const ctx = contextWithUser({ id: 'u1', role: 'ADMIN' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies when there is no authenticated principal', () => {
    const guard = new RolesGuard(reflectorReturning(['ADMIN']));
    const ctx = contextWithUser(undefined);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows any authenticated user when no @Roles is declared', () => {
    const guard = new RolesGuard(reflectorReturning(undefined));
    const ctx = contextWithUser({ id: 'u1', role: 'PIC' });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
