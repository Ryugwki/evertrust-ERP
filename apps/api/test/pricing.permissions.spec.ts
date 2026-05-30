import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasPermission } from '@evertrust/shared';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';
import { PricingController } from '../src/pricing/pricing.controller';
import { LineItemsController } from '../src/pricing/line-items.controller';
import type { AuthUser } from '../src/auth/auth.types';

// Binds the REAL pricing routes' declared @RequirePermissions to the L1–L5
// mapping end-to-end, so a regression in either the decorator or ROLE_PERMISSIONS
// is caught. L5 (PIC) holds pricing:read but NOT pricing:write/approve; L4 (Niche
// lead) holds pricing:write but NOT pricing:approve; L3 (Lane lead) holds all.
const L5: AuthUser = { id: 'u-l5', role: 'L5', organizationId: 'org1' };
const L4: AuthUser = { id: 'u-l4', role: 'L4', organizationId: 'org1' };
const L3: AuthUser = { id: 'u-l3', role: 'L3', organizationId: 'org1' };

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

const ctxGetPricing = (u: AuthUser) =>
  contextFor(
    () => PricingController.prototype.getPricing,
    () => PricingController,
    u,
  );
const ctxUpsertPricing = (u: AuthUser) =>
  contextFor(
    () => PricingController.prototype.upsertPricing,
    () => PricingController,
    u,
  );
const ctxFinalize = (u: AuthUser) =>
  contextFor(
    () => PricingController.prototype.finalize,
    () => PricingController,
    u,
  );
const ctxCreateObservation = (u: AuthUser) =>
  contextFor(
    () => LineItemsController.prototype.createObservation,
    () => LineItemsController,
    u,
  );

describe('pricing route permission gating (L1–L5 matrix)', () => {
  const guard = new PermissionsGuard(new Reflector());

  it('the canonical pricing permission split holds', () => {
    expect(hasPermission('L5', 'pricing:read')).toBe(true);
    expect(hasPermission('L5', 'pricing:write')).toBe(false);
    expect(hasPermission('L5', 'pricing:approve')).toBe(false);
    expect(hasPermission('L4', 'pricing:write')).toBe(true);
    expect(hasPermission('L4', 'pricing:approve')).toBe(false);
    expect(hasPermission('L3', 'pricing:approve')).toBe(true);
  });

  it('allows L5 to GET the pricing view (has pricing:read)', () => {
    expect(guard.canActivate(ctxGetPricing(L5))).toBe(true);
  });

  it('forbids L5 from upserting pricing (lacks pricing:write)', () => {
    expect(() => guard.canActivate(ctxUpsertPricing(L5))).toThrow(
      ForbiddenException,
    );
  });

  it('allows L4 to upsert pricing and record an observation (pricing:write)', () => {
    expect(guard.canActivate(ctxUpsertPricing(L4))).toBe(true);
    expect(guard.canActivate(ctxCreateObservation(L4))).toBe(true);
  });

  it('forbids L4 from finalizing pricing (lacks pricing:approve)', () => {
    expect(() => guard.canActivate(ctxFinalize(L4))).toThrow(
      ForbiddenException,
    );
  });

  it('allows L3 to finalize pricing (has pricing:approve)', () => {
    expect(guard.canActivate(ctxFinalize(L3))).toBe(true);
  });
});
