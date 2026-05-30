import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasPermission } from '@evertrust/shared';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';
import { TendersController } from '../src/tenders/tenders.controller';
import { CustomersController } from '../src/customers/customers.controller';
import type { AuthUser } from '../src/auth/auth.types';

// L5 (Member / PIC) holds tenders:write but NOT customers:write. L3 (Lane lead)
// holds both. This split lets us bind a real route's declared permission to the
// L1–L5 mapping end-to-end.
const L5: AuthUser = { id: 'u-l5', role: 'L5', organizationId: 'org1' };
const L3: AuthUser = { id: 'u-l3', role: 'L3', organizationId: 'org1' };

// Build an ExecutionContext that targets a REAL controller handler, so the guard
// reads the actual @RequirePermissions(...) metadata on the route (not a
// hand-fed value).
function contextFor(
  getHandler: () => unknown,
  getClass: () => unknown,
  user: AuthUser,
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler,
    getClass,
  } as unknown as ExecutionContext;
}

function contextForTenderCreate(user: AuthUser): ExecutionContext {
  return contextFor(
    () => TendersController.prototype.create,
    () => TendersController,
    user,
  );
}

function contextForCustomerCreate(user: AuthUser): ExecutionContext {
  return contextFor(
    () => CustomersController.prototype.create,
    () => CustomersController,
    user,
  );
}

function contextForTenderAssign(user: AuthUser): ExecutionContext {
  return contextFor(
    () => TendersController.prototype.assign,
    () => TendersController,
    user,
  );
}

// WHY: POST /tenders is gated by tenders:write — every L-role holds it. POST
// /customers is gated by customers:write — L5 lacks it, L3 holds it. This binds
// the routes' declared permissions to the role mapping end-to-end, so a
// regression in either the decorator or ROLE_PERMISSIONS is caught.
describe('tender + customer write permission gating', () => {
  const guard = new PermissionsGuard(new Reflector());

  it('L5 holds tenders:write; L5 lacks customers:write (L3 holds it)', () => {
    expect(hasPermission('L5', 'tenders:write')).toBe(true);
    expect(hasPermission('L5', 'customers:write')).toBe(false);
    expect(hasPermission('L3', 'customers:write')).toBe(true);
  });

  it('allows an L5 to create a tender (has tenders:write)', () => {
    expect(guard.canActivate(contextForTenderCreate(L5))).toBe(true);
  });

  it('forbids an L5 from creating a customer (lacks customers:write)', () => {
    expect(() => guard.canActivate(contextForCustomerCreate(L5))).toThrow(
      ForbiddenException,
    );
  });

  it('allows an L3 to create a customer (has customers:write)', () => {
    expect(guard.canActivate(contextForCustomerCreate(L3))).toBe(true);
  });

  // WHY (Phase 4 / Combine matrix): assignment is an L1–L4 authority. L5 (PIC)
  // can be assigned but cannot assign — POST /tenders/:id/assign is gated by
  // tenders:assign, which L5 lacks. This pins the canonical permission split.
  it('L3 holds tenders:assign; L5 does not', () => {
    expect(hasPermission('L3', 'tenders:assign')).toBe(true);
    expect(hasPermission('L5', 'tenders:assign')).toBe(false);
  });

  it('forbids an L5 from assigning a tender (lacks tenders:assign)', () => {
    expect(() => guard.canActivate(contextForTenderAssign(L5))).toThrow(
      ForbiddenException,
    );
  });

  it('allows an L3 to assign a tender (has tenders:assign)', () => {
    expect(guard.canActivate(contextForTenderAssign(L3))).toBe(true);
  });
});
