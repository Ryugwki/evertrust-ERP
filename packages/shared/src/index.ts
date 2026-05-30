// @evertrust/shared — single source of truth for DTOs/types shared by api + web.
// Every API contract lives here as a Zod schema so client and server cannot drift.
import { z } from 'zod';

export const HealthDto = z.object({
  status: z.literal('ok'),
  service: z.string(),
  at: z.string(),
  // false when the DB `select 1` probe fails; the endpoint still returns 200 so
  // it can be used as a container healthcheck that does not flap on DB blips.
  db: z.boolean(),
});
export type HealthDto = z.infer<typeof HealthDto>;

// User role mirrors the `user_role` pgEnum in @evertrust/db. Kept as a literal
// union here so @evertrust/shared has no dependency on the DB package.
export const UserRole = z.enum(['PIC', 'PRICING', 'MANAGEMENT', 'ADMIN']);
export type UserRole = z.infer<typeof UserRole>;

// ---- Permissions (single source of truth for RBAC) ----
// Roles are coarse identity; permissions are the fine-grained authority the API
// enforces. A role expands to a set of permissions via ROLE_PERMISSIONS, and the
// API's PermissionsGuard checks permissions — never roles — so authorization
// rules live in one place and the role->permission mapping can evolve freely.
export const PERMISSIONS = [
  'tenders:read',
  'tenders:write',
  'tenders:transition',
  'tenders:assign',
  'suppliers:read',
  'suppliers:write',
  'customers:read',
  'customers:write',
  'pricing:read',
  'pricing:write',
  'pricing:approve',
  'approvals:read',
  'approvals:decide',
  'compliance:read',
  'compliance:review',
  'audit:read',
  'users:manage',
  'org:manage',
  'admin:config',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

// Authoritative role -> permissions mapping. ADMIN holds every permission; the
// other roles are explicit allow-lists. Changing access policy means changing
// this table, nothing else.
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [...PERMISSIONS],
  MANAGEMENT: [
    'tenders:read',
    'tenders:transition',
    'tenders:assign',
    'suppliers:read',
    'customers:read',
    'pricing:read',
    'pricing:approve',
    'approvals:read',
    'approvals:decide',
    'compliance:read',
    'compliance:review',
    'audit:read',
  ],
  PIC: [
    'tenders:read',
    'tenders:write',
    'tenders:transition',
    'tenders:assign',
    'suppliers:read',
    'customers:read',
    'pricing:read',
    'approvals:read',
    'compliance:read',
    'audit:read',
  ],
  PRICING: [
    'tenders:read',
    'suppliers:read',
    'suppliers:write',
    'customers:read',
    'pricing:read',
    'pricing:write',
  ],
};

// Permissions granted to a role. Returns a fresh array so callers can't mutate
// the shared mapping.
export function permissionsForRole(role: UserRole): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

// True when the role's permission set includes `perm`.
export function hasPermission(role: UserRole, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(perm);
}

// ---- Organization (tenant) contract ----
// The tenant boundary. The app runs single-tenant today, but every user and
// org-scoped entity carries an organizationId so it is SaaS-ready by construction.
export const OrganizationDto = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
});
export type OrganizationDto = z.infer<typeof OrganizationDto>;

// ---- Auth contracts (single source of truth for api <-> web) ----

export const LoginDto = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof LoginDto>;

// Public shape of a user returned to clients. Never includes the password hash.
// organizationId is the tenant the user belongs to (carried into the JWT).
export const MeDto = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: UserRole,
  organizationId: z.string().uuid(),
});
export type MeDto = z.infer<typeof MeDto>;

export const LoginResponseDto = z.object({
  accessToken: z.string(),
  user: MeDto,
});
export type LoginResponseDto = z.infer<typeof LoginResponseDto>;

export const UpdateMyNameDto = z.object({
  name: z.string().min(1).max(200),
});
export type UpdateMyNameDto = z.infer<typeof UpdateMyNameDto>;
