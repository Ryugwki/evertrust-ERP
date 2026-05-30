import { pgEnum } from 'drizzle-orm/pg-core';

// Centralized pgEnum definitions. Every bracketed [A|B|C] field in the data
// model maps to exactly one of these. Enum names are snake_case + `_enum`.

export const userRoleEnum = pgEnum('user_role', [
  'L1',
  'L2',
  'L3',
  'L4',
  'L5',
]);

export const laneEnum = pgEnum('lane', ['OPERATIONS', 'MARKETING', 'HR']);

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
