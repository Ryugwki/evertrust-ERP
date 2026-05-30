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

// User role mirrors the `user_role` pgEnum in @evertrust/db. The canonical
// "Combine" tiers L1–L5: L1 Super Admin (CEO), L2 Director/Governance, L3 Lane
// lead, L4 Niche lead, L5 Member/PIC. Kept as a literal union here so
// @evertrust/shared has no dependency on the DB package.
export const UserRole = z.enum(['L1', 'L2', 'L3', 'L4', 'L5']);
export type UserRole = z.infer<typeof UserRole>;

// Operational lane a user belongs to. Mirrors the `lane` pgEnum in @evertrust/db.
// Cross-cutting axis to the L1–L5 tier: a user has one role tier AND one lane.
export const Lane = z.enum(['OPERATIONS', 'MARKETING', 'HR']);
export type Lane = z.infer<typeof Lane>;

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

// Authoritative role -> permissions mapping (the L1–L5 "Combine" matrix). L1
// holds every permission; L2 is L1 minus users:manage; L3/L4/L5 are explicit
// allow-lists. Changing access policy means changing this table, nothing else.
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // L1 Super Admin / CEO: every permission.
  L1: [...PERMISSIONS],
  // L2 Director / Governance: everything except users:manage.
  L2: PERMISSIONS.filter((p) => p !== 'users:manage'),
  // L3 Lane lead.
  L3: [
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
  ],
  // L4 Niche lead: like L3 but no pricing:approve, no approvals:decide, and
  // customers read-only.
  L4: [
    'tenders:read',
    'tenders:write',
    'tenders:transition',
    'tenders:assign',
    'suppliers:read',
    'suppliers:write',
    'customers:read',
    'pricing:read',
    'pricing:write',
    'approvals:read',
    'compliance:read',
    'compliance:review',
    'audit:read',
  ],
  // L5 Member / PIC.
  L5: [
    'tenders:read',
    'tenders:write',
    'tenders:transition',
    'suppliers:read',
    'customers:read',
    'pricing:read',
    'approvals:read',
    'compliance:read',
    'audit:read',
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
  // The user's operational lane. OPTIONAL so a pre-lane deployment (which does
  // not yet send it) keeps validating before the coordinated redeploy.
  lane: Lane.optional(),
  organizationId: z.string().uuid(),
  // OPTIONAL on purpose: the human-readable org name is added by the M1 /auth/me
  // join. Keeping it optional means the currently-deployed api/web (which does
  // not yet send/expect it) keep validating before the coordinated redeploy.
  organizationName: z.string().optional(),
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

// ============================================================================
// ERP CORE (M1): tenders + supplier/customer registries
// All read DTOs mirror the @evertrust/db rows AS THEY ARRIVE OVER HTTP:
//   numeric  -> string (postgres-js keeps numeric precision as a string)
//   timestamp-> ISO string (Date is JSON-serialized to an ISO string)
//   uuid     -> string
// nullable DB columns are .nullable() here so the read shape can't drift.
// ============================================================================

// ---- Tenders ----

// Mirrors the tender_status pgEnum (@evertrust/db). The canonical 7-value
// "Combine" chain. The lifecycle is governed by the STATE_MACHINE in the API;
// this enum is just the set of valid states.
export const TenderStatus = z.enum([
  'NOT_STARTED',
  'PIC_PRICING',
  'CUSTOMER_PRICING',
  'DOCUMENTS',
  'SUBMITTED',
  'AWARDED',
  'LOST',
]);
export type TenderStatus = z.infer<typeof TenderStatus>;

// ---- Tender state machine (single source of truth) ----
// The tender lifecycle as an explicit adjacency map: status -> the statuses it
// may legally transition to. Lives here so the API (enforcement) and the web UI
// (which next-states to offer) read the EXACT same authority instead of
// re-deriving the rules. Terminal states (AWARDED, LOST) have no outgoing
// transitions. Every non-terminal state can drop to LOST. PIC_PRICING may fork
// to DOCUMENTS directly (Track B documentation running in parallel).
export const STATE_MACHINE: Record<TenderStatus, readonly TenderStatus[]> = {
  NOT_STARTED: ['PIC_PRICING', 'LOST'],
  PIC_PRICING: ['CUSTOMER_PRICING', 'DOCUMENTS', 'LOST'],
  CUSTOMER_PRICING: ['DOCUMENTS', 'LOST'],
  DOCUMENTS: ['SUBMITTED', 'LOST'],
  SUBMITTED: ['AWARDED', 'LOST'],
  AWARDED: [],
  LOST: [],
};

// True iff `to` is a legal next state from `from` per STATE_MACHINE.
export function canTransition(from: TenderStatus, to: TenderStatus): boolean {
  return STATE_MACHINE[from].includes(to);
}

// The legal next states from `status` (a fresh array so callers can't mutate the
// shared map). Empty for terminal states. The web UI uses this to render exactly
// the transition affordances the API will accept.
export function nextStates(status: TenderStatus): TenderStatus[] {
  return [...STATE_MACHINE[status]];
}

// Mirrors the tender_regime pgEnum.
export const TenderRegime = z.enum(['VOB_A', 'VgV', 'UVgO']);
export type TenderRegime = z.infer<typeof TenderRegime>;

// Full read shape of a tender row (the API GET responses).
export const TenderDto = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  // Portal-issued Vergabe-ID (German procurement reference). No internal numbering.
  vergabeId: z.string(),
  source: z.string(),
  title: z.string(),
  buyer: z.string().nullable(),
  customerId: z.string().uuid().nullable(),
  regime: TenderRegime.nullable(),
  niche: z.string().nullable(),
  status: TenderStatus,
  estimatedValue: z.string().nullable(),
  currency: z.string(),
  isAboveThreshold: z.boolean(),
  questionsDeadlineAt: z.string().nullable(),
  submissionDeadlineAt: z.string().nullable(),
  location: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TenderDto = z.infer<typeof TenderDto>;

// Create payload. vergabeId/source/title are REQUIRED; everything else is
// optional. status and organizationId are deliberately ABSENT — the server sets
// status='NOT_STARTED' and organizationId from the authenticated tenant.
export const CreateTenderDto = z.object({
  vergabeId: z.string().min(1),
  source: z.string().min(1),
  title: z.string().min(1),
  buyer: z.string().optional(),
  customerId: z.string().uuid().optional(),
  regime: TenderRegime.optional(),
  niche: z.string().optional(),
  estimatedValue: z.string().optional(),
  currency: z.string().length(3).optional(),
  isAboveThreshold: z.boolean().optional(),
  questionsDeadlineAt: z.string().datetime().optional(),
  submissionDeadlineAt: z.string().datetime().optional(),
  location: z.string().optional(),
});
export type CreateTenderDto = z.infer<typeof CreateTenderDto>;

// Partial update of the writable fields. status is NOT writable here — it only
// changes through POST /tenders/:id/transition. organizationId is never writable.
export const UpdateTenderDto = CreateTenderDto.partial();
export type UpdateTenderDto = z.infer<typeof UpdateTenderDto>;

// Body for POST /tenders/:id/transition — the target status. Whether the
// transition is legal is decided by the server-side STATE_MACHINE.
export const TransitionTenderDto = z.object({
  to: TenderStatus,
});
export type TransitionTenderDto = z.infer<typeof TransitionTenderDto>;

// Query params for GET /tenders. Optional status filter.
export const ListTendersQuery = z.object({
  status: TenderStatus.optional(),
});
export type ListTendersQuery = z.infer<typeof ListTendersQuery>;

// ---- Suppliers ----

export const SupplierDto = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string(),
  niches: z.array(z.string()),
  capabilities: z.array(z.string()),
  fitScore: z.string().nullable(),
  contact: z.string().nullable(),
  createdAt: z.string(),
});
export type SupplierDto = z.infer<typeof SupplierDto>;

export const CreateSupplierDto = z.object({
  name: z.string().min(1),
  niches: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  fitScore: z.string().optional(),
  contact: z.string().optional(),
});
export type CreateSupplierDto = z.infer<typeof CreateSupplierDto>;

export const UpdateSupplierDto = CreateSupplierDto.partial();
export type UpdateSupplierDto = z.infer<typeof UpdateSupplierDto>;

// ---- Customers ----

export const CustomerDto = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string(),
  contact: z.string().nullable(),
  niches: z.array(z.string()),
  createdAt: z.string(),
});
export type CustomerDto = z.infer<typeof CustomerDto>;

export const CreateCustomerDto = z.object({
  name: z.string().min(1),
  contact: z.string().optional(),
  niches: z.array(z.string()).optional(),
});
export type CreateCustomerDto = z.infer<typeof CreateCustomerDto>;

export const UpdateCustomerDto = CreateCustomerDto.partial();
export type UpdateCustomerDto = z.infer<typeof UpdateCustomerDto>;
