import { pgEnum } from 'drizzle-orm/pg-core';

// Centralized pgEnum definitions. Every bracketed [A|B|C] field in the data
// model maps to exactly one of these. Enum names are snake_case + `_enum`.

export const userRoleEnum = pgEnum('user_role', [
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'EMPLOYEE',
]);

// Department (org unit) a user belongs to. Replaces the former `lane` enum;
// NULLABLE on the users table (a user may belong to no single department).
export const departmentEnum = pgEnum('department', [
  'OPERATIONS',
  'IT',
  'CONSULTING',
  'MARKETING',
  'BUSINESS',
  'HR',
]);

// Job title / position. NULLABLE on the users table; descriptive only (carries
// no authority — that comes from the role's permissions).
export const userPositionEnum = pgEnum('user_position', [
  'CEO',
  'CTO',
  'CFO',
  'COO',
  'DEPT_MANAGER',
  'EXECUTIVE',
  'OFFICER',
  'SPECIALIST',
]);

export const tenderRegimeEnum = pgEnum('tender_regime', [
  'VOB_A',
  'VgV',
  'UVgO',
]);

export const tenderStatusEnum = pgEnum('tender_status', [
  'NOT_STARTED',
  'PIC_PRICING',
  'CUSTOMER_PRICING',
  'DOCUMENTS',
  'SUBMITTED',
  'AWARDED',
  'LOST',
]);

export const documentTypeEnum = pgEnum('document_type', ['TYPE1', 'TYPE2']);

export const ocrStatusEnum = pgEnum('ocr_status', ['PENDING', 'DONE', 'FAILED']);

// Provenance of a single price_observation. Named `price_obs_source` (NOT
// reusing any prior enum name) so drizzle never has to ALTER an existing enum's
// values — value changes on a live enum are unreliable (see tasks/lessons.md).
// REAL vs estimate weighting lives in @evertrust/shared (SOURCE_WEIGHT).
export const priceObsSourceEnum = pgEnum('price_obs_source', [
  'SUPPLIER_QUOTE',
  'MANUAL',
  'AI_ESTIMATE',
  'COMPETITOR_WINNER',
  'OUR_SUBMITTED',
  'OUR_BENCHMARK',
  'IBAU_HISTORICAL',
]);

export const pricingStatusEnum = pgEnum('pricing_status', [
  'DRAFT',
  'REVIEW',
  'FINAL',
]);

export const approvalTypeEnum = pgEnum('approval_type', [
  'PRICING',
  'CUSTOMER',
  'QC',
]);

export const approvalStatusEnum = pgEnum('approval_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
]);

export const auditActorTypeEnum = pgEnum('audit_actor_type', [
  'USER',
  'SYSTEM',
  'N8N',
  'DEEPSEEK',
  'CLAUDE',
]);

// Lifecycle of a Growth-Engine campaign (the "AIM sequence"). DRAFT = saved but
// not deployed (e.g. the AIM webhook URL is unset); DEPLOYED = the AIM n8n
// workflow created the Drive campaign folder; FAILED = the deploy call errored.
export const campaignStatusEnum = pgEnum('campaign_status', [
  'DRAFT',
  'DEPLOYED',
  'FAILED',
]);

// The outbound arsenal stages the ERP can fire as n8n webhooks (AIM excluded — it
// is the campaign launch, handled by the campaigns module).
export const arsenalStageEnum = pgEnum('arsenal_stage', [
  'LEAD_SATELLITE',
  'AMMO_FORGE',
  'REACH_BAZOOKA',
  'REPLY_GLOCK',
  'SLEEPER_GRENADE',
]);

// What initiated an arsenal run: a human pressing "Run now", or the ERP's own
// daily scheduler (e.g. the Bazooka daily send).
export const arsenalRunSourceEnum = pgEnum('arsenal_run_source', [
  'MANUAL',
  'SCHEDULED',
]);

// Outcome of the ERP→n8n hand-off. DISPATCHED = the webhook accepted the trigger
// (n8n then runs async); FAILED = the ERP could not reach it / non-2xx. The ERP
// owns the hand-off, not the downstream n8n execution.
export const arsenalRunStatusEnum = pgEnum('arsenal_run_status', [
  'DISPATCHED',
  'FAILED',
]);
