import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasPermission } from '@evertrust/shared';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';
import { TendersController } from '../src/tenders/tenders.controller';
import type { AuthUser } from '../src/auth/auth.types';

const PIC: AuthUser = { id: 'u-pic', role: 'PIC', organizationId: 'org1' };
const PRICING: AuthUser = { id: 'u-prc', role: 'PRICING', organizationId: 'org1' };

// Build an ExecutionContext that targets the REAL TendersController.create
// handler, so the guard reads the actual @RequirePermissions('tenders:write')
// metadata on the route (not a hand-fed value).
function contextForCreate(user: AuthUser): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => TendersController.prototype.create,
    getClass: () => TendersController,
  } as unknown as ExecutionContext;
}

// WHY: POST /tenders is gated by tenders:write. PIC holds it; PRICING does not.
// This binds the route's declared permission to the role mapping end-to-end, so
// a regression in either the decorator or ROLE_PERMISSIONS is caught.
describe('POST /tenders permission gating (tenders:write)', () => {
  const guard = new PermissionsGuard(new Reflector());

  it('the route requires a permission PIC has and PRICING lacks', () => {
    expect(hasPermission('PIC', 'tenders:write')).toBe(true);
    expect(hasPermission('PRICING', 'tenders:write')).toBe(false);
  });

  it('allows a PIC to create (has tenders:write)', () => {
    expect(guard.canActivate(contextForCreate(PIC))).toBe(true);
  });

  it('forbids a PRICING user from creating (lacks tenders:write)', () => {
    expect(() => guard.canActivate(contextForCreate(PRICING))).toThrow(
      ForbiddenException,
    );
  });
});
