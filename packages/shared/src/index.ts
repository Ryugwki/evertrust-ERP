// @evertrust/shared — single source of truth for DTOs/types shared by api + web.
// Every API contract lives here as a Zod schema so client and server cannot drift.
import { z } from 'zod';

// Phase 5a pricing: the pure/deterministic pricing engine + pricing DTOs.
export * from './pricing';

export const HealthDto = z.object({
  status: z.literal('ok'),
  service: z.string(),
  at: z.string(),
  // false when the DB `select 1` probe fails; the endpoint still returns 200 so
  // it can be used as a container healthcheck that does not flap on DB blips.
  db: z.boolean(),
});
export type HealthDto = z.infer<typeof HealthDto>;

// User role mirrors the `user_role` pgEnum in @evertrust/db. Four authority
// tiers, highest → lowest: SUPER_ADMIN (full control incl. user management),
// ADMIN (everything except managing users), MANAGER (lead-level: pricing
// approval, approvals decisions, campaign launches), EMPLOYEE (operational read
// + day-to-day write). Authority is enforced via permissions, never the role
// literal — see ROLE_PERMISSIONS. Kept as a literal union here so
// @evertrust/shared has no dependency on the DB package.
export const UserRole = z.enum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE']);
export type UserRole = z.infer<typeof UserRole>;

// Human-readable role labels for UI display (SSOT so api + web never drift).
export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
};

// Department (org unit) a user belongs to. Mirrors the `department` pgEnum in
// @evertrust/db. Orthogonal to the role tier and NULLABLE — e.g. a CEO may sit
// across the whole company with no single department.
export const Department = z.enum([
  'OPERATIONS',
  'IT',
  'CONSULTING',
  'MARKETING',
  'BUSINESS',
  'HR',
]);
export type Department = z.infer<typeof Department>;
export const DEPARTMENT_LABELS: Record<Department, string> = {
  OPERATIONS: 'Operations',
  IT: 'IT',
  CONSULTING: 'Consulting',
  MARKETING: 'Marketing',
  BUSINESS: 'Business',
  HR: 'HR',
};

// Job title / position. Mirrors the `user_position` pgEnum in @evertrust/db.
// Orthogonal to role + department and NULLABLE. Descriptive only — it carries no
// authority (authority comes from the role's permissions).
export const Position = z.enum([
  'CEO',
  'CTO',
  'CFO',
  'COO',
  'DEPT_MANAGER',
  'EXECUTIVE',
  'OFFICER',
  'SPECIALIST',
]);
export type Position = z.infer<typeof Position>;
export const POSITION_LABELS: Record<Position, string> = {
  CEO: 'CEO',
  CTO: 'CTO',
  CFO: 'CFO',
  COO: 'COO',
  DEPT_MANAGER: 'Dept. Manager',
  EXECUTIVE: 'Executive',
  OFFICER: 'Officer',
  SPECIALIST: 'Specialist',
};

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
  'campaigns:read',
  'campaigns:write',
  'audit:read',
  'users:manage',
  'org:manage',
  'admin:config',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

// Authoritative role -> permissions mapping. SUPER_ADMIN holds every permission;
// ADMIN is SUPER_ADMIN minus users:manage; MANAGER and EMPLOYEE are explicit
// allow-lists. Changing access policy means changing this table, nothing else.
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // Super Admin (CEO / owner): every permission, including user management.
  SUPER_ADMIN: [...PERMISSIONS],
  // Admin: everything except managing other users.
  ADMIN: PERMISSIONS.filter((p) => p !== 'users:manage'),
  // Manager (lead-level): full tender/pricing/approval/campaign authority.
  MANAGER: [
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
    'campaigns:read',
    'campaigns:write',
    'audit:read',
  ],
  // Employee (operator): read across the board, write where day-to-day work
  // happens (tenders), but no pricing/approval sign-off and no campaign launches.
  EMPLOYEE: [
    'tenders:read',
    'tenders:write',
    'tenders:transition',
    'suppliers:read',
    'customers:read',
    'pricing:read',
    'approvals:read',
    'compliance:read',
    'campaigns:read',
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
  // Department + job title. NULLABLE (a user may have neither) and optional too,
  // for rolling-deploy safety. See the `department`/`user_position` pgEnums.
  department: Department.nullable().optional(),
  position: Position.nullable().optional(),
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

// ---- Phase 6 (R30): the customer-approval gate ----
// "No written approval → no submission" expressed as ONE pure rule, shared by the
// API (enforcement in TendersService.transition) and the web UI (which disables +
// explains the SUBMITTED affordance) so they cannot drift. Submitting (→SUBMITTED)
// is HARD-BLOCKED unless the tender has a recorded APPROVED customer approval. The
// gate is channel-agnostic: it asks only whether an approval EXISTS, never how it
// arrived (WhatsApp / email / call all count once a human records it).
export function isSubmissionBlocked(
  to: TenderStatus,
  hasApprovedCustomerApproval: boolean,
): boolean {
  return to === 'SUBMITTED' && !hasApprovedCustomerApproval;
}

// ---- Phase 6 (R31): deadline safety + escalation ----
// Days-before-submission-deadline at which a tender escalates up the
// MANAGER→ADMIN→SUPER_ADMIN chain. T-2 is the "deadline safety" trigger
// (MANAGER); it climbs to ADMIN (T-1) then SUPER_ADMIN (T-0 / overdue) as the
// deadline nears. Pure constants so the API (computation), the web UI (badges)
// and n8n (who to notify) read ONE authority.
export const DEADLINE_ESCALATION_DAYS = {
  MANAGER: 2,
  ADMIN: 1,
  SUPER_ADMIN: 0,
} as const;

// Reminder cadence: days-before-deadline marks at which an informational reminder
// is due (BEFORE escalation starts). The ERP exposes the risk; n8n Cloud sends and
// dedupes the actual reminders (thin orchestration — no business logic in n8n).
export const REMINDER_CADENCE_DAYS = [5, 3, 1] as const;

// Escalation target role (a real UserRole, or NONE when the tender is not at risk).
export const EscalationLevel = z.enum([
  'NONE',
  'MANAGER',
  'ADMIN',
  'SUPER_ADMIN',
]);
export type EscalationLevel = z.infer<typeof EscalationLevel>;

// Coarse severity for UI colour. AT_RISK spans the T-2..T-0 escalation window;
// DUE_SOON is the pre-escalation reminder window (T-5..T-3).
export const DeadlineLevel = z.enum([
  'NONE',
  'SAFE',
  'DUE_SOON',
  'AT_RISK',
  'OVERDUE',
]);
export type DeadlineLevel = z.infer<typeof DeadlineLevel>;

// The computed deadline risk of one tender. daysRemaining is whole days (floored);
// negative = overdue; null when there is no deadline or the tender is closed.
export const DeadlineRiskDto = z.object({
  hasDeadline: z.boolean(),
  daysRemaining: z.number().nullable(),
  atRisk: z.boolean(),
  escalateTo: EscalationLevel,
  level: DeadlineLevel,
});
export type DeadlineRiskDto = z.infer<typeof DeadlineRiskDto>;

// Pure deadline-risk for one tender. Only OPEN tenders carry risk — a closed
// tender (SUBMITTED / AWARDED / LOST) is never "at risk", nor is one without a
// submission deadline. `now` is injected (never read from the clock here) so the
// rule is deterministic and unit-testable.
export function computeDeadlineRisk(
  submissionDeadlineAt: string | null,
  now: Date,
  status: TenderStatus,
): DeadlineRiskDto {
  const closed =
    status === 'SUBMITTED' || status === 'AWARDED' || status === 'LOST';
  const deadlineMs = submissionDeadlineAt
    ? new Date(submissionDeadlineAt).getTime()
    : NaN;

  if (!submissionDeadlineAt || closed || Number.isNaN(deadlineMs)) {
    return {
      hasDeadline: Boolean(submissionDeadlineAt),
      daysRemaining: null,
      atRisk: false,
      escalateTo: 'NONE',
      level: 'NONE',
    };
  }

  const days = Math.floor((deadlineMs - now.getTime()) / 86_400_000);

  let escalateTo: EscalationLevel = 'NONE';
  if (days <= DEADLINE_ESCALATION_DAYS.SUPER_ADMIN) escalateTo = 'SUPER_ADMIN';
  else if (days <= DEADLINE_ESCALATION_DAYS.ADMIN) escalateTo = 'ADMIN';
  else if (days <= DEADLINE_ESCALATION_DAYS.MANAGER) escalateTo = 'MANAGER';

  let level: DeadlineLevel;
  if (days < 0) level = 'OVERDUE';
  else if (days <= DEADLINE_ESCALATION_DAYS.MANAGER) level = 'AT_RISK';
  else if (days <= REMINDER_CADENCE_DAYS[0]) level = 'DUE_SOON';
  else level = 'SAFE';

  return {
    hasDeadline: true,
    daysRemaining: days,
    atRisk: escalateTo !== 'NONE',
    escalateTo,
    level,
  };
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

// ============================================================================
// PHASE 4 (R20–R22): users list · tender assignment · TYPE 1 documents
// ============================================================================

// ---- Users (org directory, read-only list) ----
// Lightweight user shape for org-scoped pickers (e.g. the assignee Select). Never
// exposes auth/credential fields. department/position are nullable + optional.
export const UserListItemDto = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: UserRole,
  department: Department.nullable().optional(),
  position: Position.nullable().optional(),
});
export type UserListItemDto = z.infer<typeof UserListItemDto>;

// Full user row for the admin user-management table (users:manage only). Adds
// active + createdAt to the directory shape.
export const AdminUserDto = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: UserRole,
  position: Position.nullable(),
  department: Department.nullable(),
  active: z.boolean(),
  createdAt: z.string(),
});
export type AdminUserDto = z.infer<typeof AdminUserDto>;

// Patch a user's role / position / department from the management table. Every
// field optional so the table can PATCH a single cell; position/department are
// nullable so they can be cleared (e.g. a CEO with no department).
export const UpdateUserDto = z.object({
  role: UserRole.optional(),
  position: Position.nullable().optional(),
  department: Department.nullable().optional(),
});
export type UpdateUserDto = z.infer<typeof UpdateUserDto>;

// ---- Tender assignment (manual L5-PIC assign) ----
// Body for POST /tenders/:id/assign. reason is optional context (<= 500 chars).
export const AssignTenderDto = z.object({
  picId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});
export type AssignTenderDto = z.infer<typeof AssignTenderDto>;

// The ACTIVE assignment of a tender (picName joined from users). assignedAt is an
// ISO string over the wire; status is the lifecycle token (ACTIVE/REASSIGNED).
export const AssignmentDto = z.object({
  id: z.string().uuid(),
  tenderId: z.string().uuid(),
  picId: z.string().uuid(),
  picName: z.string(),
  reason: z.string().nullable(),
  assignedAt: z.string(),
  status: z.string(),
});
export type AssignmentDto = z.infer<typeof AssignmentDto>;

// ---- Documents (TYPE 1 upload) ----
// Mirrors the document_type pgEnum (@evertrust/db).
export const DocumentType = z.enum(['TYPE1', 'TYPE2']);
export type DocumentType = z.infer<typeof DocumentType>;

// Mirrors the ocr_status pgEnum.
export const OcrStatus = z.enum(['PENDING', 'DONE', 'FAILED']);
export type OcrStatus = z.infer<typeof OcrStatus>;

// Read shape of a documents row over HTTP. Metadata only — the binary is fetched
// separately via GET /documents/:id/download. Nullable columns are .nullable().
export const DocumentDto = z.object({
  id: z.string().uuid(),
  tenderId: z.string().uuid(),
  type: DocumentType,
  kind: z.string().nullable(),
  originalName: z.string(),
  mimeType: z.string().nullable(),
  sizeBytes: z.number().nullable(),
  ocrStatus: OcrStatus,
  uploadedBy: z.string().uuid().nullable(),
  createdAt: z.string(),
});
export type DocumentDto = z.infer<typeof DocumentDto>;

// Multipart upload fields for POST /tenders/:id/documents (the file rides
// alongside as `file`). type defaults to TYPE1; kind is optional free-text.
export const UploadDocumentDto = z.object({
  type: DocumentType.default('TYPE1'),
  kind: z.string().max(200).optional(),
});
export type UploadDocumentDto = z.infer<typeof UploadDocumentDto>;

// ============================================================================
// PHASE 6 (R30–R31): customer-approval gate
// "No written approval → no submission" is enforced in CODE (see
// isSubmissionBlocked above + TendersService.transition): a tender cannot reach
// SUBMITTED unless a CUSTOMER approval is recorded APPROVED. What COUNTS as
// approval is channel-agnostic — a human records it with a free-form evidence
// reference; the gate only checks that one EXISTS.
// ============================================================================

// Mirrors the approval_type pgEnum (@evertrust/db). CUSTOMER is the Phase 6 gate;
// PRICING / QC exist for the pricing sign-off and the Phase 7 QC gate.
export const ApprovalType = z.enum(['PRICING', 'CUSTOMER', 'QC']);
export type ApprovalType = z.infer<typeof ApprovalType>;

// Mirrors the approval_status pgEnum.
export const ApprovalStatus = z.enum(['PENDING', 'APPROVED', 'REJECTED']);
export type ApprovalStatus = z.infer<typeof ApprovalStatus>;

// Read shape of an approval_requests row over HTTP. evidenceUrl is a FREE-FORM
// reference to the approval proof (a link OR a note like "phone 2026-05-30,
// confirmed by Frau Müller") — channel-agnostic by design. Nullable columns are
// .nullable(); timestamps are ISO strings over the wire.
export const ApprovalRequestDto = z.object({
  id: z.string().uuid(),
  tenderId: z.string().uuid(),
  type: ApprovalType,
  status: ApprovalStatus,
  evidenceUrl: z.string().nullable(),
  requestedAt: z.string(),
  requestedBy: z.string().uuid().nullable(),
  decidedBy: z.string().uuid().nullable(),
  decidedAt: z.string().nullable(),
});
export type ApprovalRequestDto = z.infer<typeof ApprovalRequestDto>;

// Body for POST /tenders/:tenderId/approvals — open a PENDING approval request.
// type defaults to CUSTOMER (the Phase 6 gate). evidenceUrl is optional at request
// time (usually attached when the decision is recorded). status/requestedBy are
// server-owned and deliberately absent.
export const CreateApprovalRequestDto = z.object({
  type: ApprovalType.default('CUSTOMER'),
  evidenceUrl: z.string().min(1).max(2000).optional(),
});
export type CreateApprovalRequestDto = z.infer<typeof CreateApprovalRequestDto>;

// Body for POST /approvals/:id/decide — record the customer's decision. Only
// APPROVED or REJECTED (never back to PENDING). evidenceUrl is the channel-agnostic
// proof; recommended on APPROVED so the gate has an auditable basis.
export const DecideApprovalDto = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  evidenceUrl: z.string().min(1).max(2000).optional(),
});
export type DecideApprovalDto = z.infer<typeof DecideApprovalDto>;

// A tender paired with its computed deadline risk — the row shape of
// GET /tenders/deadline-risk (the at-risk worklist the dashboard + n8n poll).
export const TenderDeadlineRiskDto = z.object({
  tender: TenderDto,
  risk: DeadlineRiskDto,
});
export type TenderDeadlineRiskDto = z.infer<typeof TenderDeadlineRiskDto>;

// ============================================================================
// GROWTH ENGINE — the "AIM sequence" (campaign launch → outbound arsenal)
// A campaign is the AIM target. On launch the API fires the AIM n8n webhook,
// which provisions the Drive campaign folder + config.json that the arsenal
// (Lead Satellite / Ammo Forge / Reach Bazooka / Reply Glock / Sleeper Grenade)
// runs against autonomously. Mirrors the reference Growth-Engine AIM form.
// ============================================================================

// Mirrors the campaign_status pgEnum. DRAFT = saved, AIM deploy not run (e.g. the
// webhook URL is unset); DEPLOYED = the AIM workflow created the Drive folder;
// FAILED = the deploy call errored (the error is captured for observability).
export const CampaignStatus = z.enum(['DRAFT', 'DEPLOYED', 'FAILED']);
export type CampaignStatus = z.infer<typeof CampaignStatus>;

// Read shape of a campaign row over HTTP. Nullable columns are .nullable();
// timestamps are ISO strings.
export const CampaignDto = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string().nullable(),
  niche: z.string(),
  target: z.string(),
  country: z.string(),
  state: z.string(),
  project: z.string(),
  gmailLabel: z.string(),
  salesCalendarId: z.string(),
  whatsappNumber: z.string(),
  status: CampaignStatus,
  driveFolderId: z.string().nullable(),
  driveFolderUrl: z.string().nullable(),
  deployError: z.string().nullable(),
  deployedBy: z.string().uuid().nullable(),
  deployedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type CampaignDto = z.infer<typeof CampaignDto>;

// Body for POST /campaigns — the 9 AIM "Lock & Load" inputs. `name` is the only
// optional one (matches the reference form). status/driveFolder*/deployed* are
// server-owned (set from the AIM webhook result) and deliberately absent.
export const CreateCampaignDto = z.object({
  name: z.string().max(60).optional(),
  niche: z.string().min(1).max(120),
  target: z.string().min(1).max(200),
  country: z.string().min(1).max(120),
  state: z.string().min(1).max(120),
  project: z.string().min(1).max(200),
  gmailLabel: z.string().min(1).max(120),
  salesCalendarId: z.string().min(1).max(200),
  whatsappNumber: z.string().min(1).max(40),
});
export type CreateCampaignDto = z.infer<typeof CreateCampaignDto>;

// ---- Arsenal triggers (the "Run now" buttons + the daily scheduler) ----
// The outbound stages the ERP can fire as n8n webhooks. AIM is excluded — it is
// the campaign launch (the campaigns module). Mirrors the arsenal_stage pgEnum.
export const ArsenalStage = z.enum([
  'LEAD_SATELLITE',
  'AMMO_FORGE',
  'REACH_BAZOOKA',
  'REPLY_GLOCK',
  'SLEEPER_GRENADE',
]);
export type ArsenalStage = z.infer<typeof ArsenalStage>;

// PER_CAMPAIGN stages operate on one campaign (need a campaignId; the ERP sends
// that campaign's context). GLOBAL stages process all active campaigns on the n8n
// side (no campaign context — e.g. the daily Bazooka send). Drives WHERE the "Run
// now" control lives: on a campaign vs in the global Arsenal panel.
export type ArsenalStageScope = 'PER_CAMPAIGN' | 'GLOBAL';
export interface ArsenalStageMeta {
  stage: ArsenalStage;
  label: string;
  scope: ArsenalStageScope;
  what: string;
}
export const ARSENAL_STAGE_META: Record<ArsenalStage, ArsenalStageMeta> = {
  LEAD_SATELLITE: {
    stage: 'LEAD_SATELLITE',
    label: 'Lead Satellite',
    scope: 'PER_CAMPAIGN',
    what: 'Pull leads from public sources into the campaign',
  },
  AMMO_FORGE: {
    stage: 'AMMO_FORGE',
    label: 'Ammo Forge',
    scope: 'PER_CAMPAIGN',
    what: 'Write the outreach docs / emails',
  },
  REACH_BAZOOKA: {
    stage: 'REACH_BAZOOKA',
    label: 'Reach Bazooka',
    scope: 'GLOBAL',
    what: 'Send the outbound batch, track replies (the daily send)',
  },
  REPLY_GLOCK: {
    stage: 'REPLY_GLOCK',
    label: 'Reply Glock',
    scope: 'GLOBAL',
    what: 'Sort & answer replies, book meetings',
  },
  SLEEPER_GRENADE: {
    stage: 'SLEEPER_GRENADE',
    label: 'Sleeper Grenade',
    scope: 'GLOBAL',
    what: 'Sweep not-interested → snooze → re-email',
  },
};

// Body for POST /arsenal/:stage/run. campaignId is REQUIRED for PER_CAMPAIGN
// stages and omitted for GLOBAL ones — the server validates against the scope.
export const RunArsenalDto = z.object({
  campaignId: z.string().uuid().optional(),
});
export type RunArsenalDto = z.infer<typeof RunArsenalDto>;

// Mirrors the arsenal_run_source / arsenal_run_status pgEnums.
export const ArsenalRunSource = z.enum(['MANUAL', 'SCHEDULED']);
export type ArsenalRunSource = z.infer<typeof ArsenalRunSource>;
export const ArsenalRunStatus = z.enum(['DISPATCHED', 'FAILED']);
export type ArsenalRunStatus = z.infer<typeof ArsenalRunStatus>;

// Read shape of an arsenal_runs row — the record of an ERP→n8n hand-off.
export const ArsenalRunDto = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid().nullable(),
  stage: ArsenalStage,
  campaignId: z.string().uuid().nullable(),
  source: ArsenalRunSource,
  status: ArsenalRunStatus,
  detail: z.string().nullable(),
  triggeredBy: z.string().uuid().nullable(),
  createdAt: z.string(),
});
export type ArsenalRunDto = z.infer<typeof ArsenalRunDto>;

// "HH:MM" (24h) — shared so the API validates and the web input matches.
export const DAILY_TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

// True if `tz` is an IANA zone this runtime's Intl recognizes (works in Node + the
// browser). Used by the API scheduler (to interpret the daily time) and the Zod
// refine below, so an unknown zone is a 400 — never a silently mis-timed send.
export function isValidTimeZone(tz: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Timezones offered for the daily Bazooka send — curated (DACH-first + UTC + US
// East), not the full IANA set, so the picker stays a short scannable dropdown.
// Values are IANA names the scheduler resolves; the first entry is the default.
export const BAZOOKA_TIMEZONES = [
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Europe/Vienna', label: 'Vienna (CET/CEST)' },
  { value: 'Europe/Zurich', label: 'Zurich (CET/CEST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'New York (ET)' },
] as const satisfies readonly { value: string; label: string }[];

export const DEFAULT_BAZOOKA_TIMEZONE = BAZOOKA_TIMEZONES[0].value;

// Per-org Growth-Engine settings. bazookaDailyAt = the ERP-editable daily Bazooka
// send time ("HH:MM", null = off); bazookaTimezone = the IANA zone that time is
// read in (null = legacy rows / server-local). Read shape of GET /arsenal/settings.
export const ArsenalSettingsDto = z.object({
  bazookaDailyAt: z.string().nullable(),
  bazookaTimezone: z.string().nullable(),
});
export type ArsenalSettingsDto = z.infer<typeof ArsenalSettingsDto>;

// Body for PUT /arsenal/settings. A valid "HH:MM" sets the daily send (null
// disables it); bazookaTimezone is a valid IANA zone (or null). Validated here so a
// bad time/zone is a 400, not a mis-scheduled send. A set time MUST carry a zone —
// the daily send is never left to interpret an implicit server clock.
export const UpdateArsenalSettingsDto = z
  .object({
    bazookaDailyAt: z
      .string()
      .regex(DAILY_TIME_REGEX, 'Use 24h HH:MM, e.g. 08:00')
      .nullable(),
    bazookaTimezone: z
      .string()
      .refine(isValidTimeZone, 'Unknown timezone')
      .nullable(),
  })
  .refine((v) => v.bazookaDailyAt === null || v.bazookaTimezone !== null, {
    message: 'Pick a timezone for the daily send.',
    path: ['bazookaTimezone'],
  });
export type UpdateArsenalSettingsDto = z.infer<typeof UpdateArsenalSettingsDto>;
