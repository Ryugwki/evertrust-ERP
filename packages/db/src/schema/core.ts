import {
  boolean,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { organizations } from './org';
import {
  documentTypeEnum,
  ocrStatusEnum,
  tenderRegimeEnum,
  tenderStatusEnum,
  userRoleEnum,
} from './enums';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Tenant boundary. NOT NULL: every user belongs to exactly one organization.
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    role: userRoleEnum('role').notNull().default('PIC'),
    name: text('name').notNull(),
    email: text('email').notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('users_email_uq').on(t.email),
    index('users_organization_id_idx').on(t.organizationId),
  ],
);

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Tenant boundary. Child tables that reference a customer inherit tenancy
    // from it and do NOT carry their own organizationId.
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: text('name').notNull(),
    contact: text('contact'),
    niches: text('niches').array().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('customers_organization_id_idx').on(t.organizationId)],
);

export const suppliers = pgTable(
  'suppliers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Tenant boundary. supplier_prices reference a supplier and inherit tenancy
    // from it; they do NOT carry their own organizationId.
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: text('name').notNull(),
    niches: text('niches').array().notNull().default([]),
    capabilities: text('capabilities').array().notNull().default([]),
    fitScore: numeric('fit_score'),
    contact: text('contact'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('suppliers_organization_id_idx').on(t.organizationId)],
);

export const tenders = pgTable(
  'tenders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Tenant boundary. Most child entities (documents, line_items, pricings,
    // approval_requests, compliance_checks, …) reference a tender and inherit
    // tenancy from it rather than carrying their own organizationId.
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    externalId: text('external_id').notNull(),
    source: text('source').notNull(),
    title: text('title').notNull(),
    buyer: text('buyer'),
    customerId: uuid('customer_id').references(() => customers.id),
    regime: tenderRegimeEnum('regime'),
    niche: text('niche'),
    status: tenderStatusEnum('status').notNull().default('DETECTED'),
    estimatedValue: numeric('estimated_value'),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    isAboveThreshold: boolean('is_above_threshold').notNull().default(false),
    questionsDeadlineAt: timestamp('questions_deadline_at', {
      withTimezone: true,
    }),
    submissionDeadlineAt: timestamp('submission_deadline_at', {
      withTimezone: true,
    }),
    location: text('location'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // UNIQUE per tenant, not globally: two organizations may legitimately track
    // the same public tender (same source+external_id), so the dedup key is
    // scoped by organization_id.
    uniqueIndex('tenders_organization_id_source_external_id_uq').on(
      t.organizationId,
      t.source,
      t.externalId,
    ),
    index('tenders_customer_id_idx').on(t.customerId),
    index('tenders_organization_id_idx').on(t.organizationId),
  ],
);

// Tenancy is inherited via the parent tender (documents.tenderId); no own
// organizationId column.
export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenderId: uuid('tender_id')
      .notNull()
      .references(() => tenders.id),
    type: documentTypeEnum('type').notNull(),
    kind: text('kind').notNull(),
    storageUrl: text('storage_url').notNull(),
    mimeType: text('mime_type'),
    ocrStatus: ocrStatusEnum('ocr_status').notNull().default('PENDING'),
    ocrText: text('ocr_text'),
    parsedRef: text('parsed_ref'),
    // self-reference: a parsed/derived doc points back to its parent document
    sourceParentDocId: uuid('source_parent_doc_id').references(
      (): any => documents.id,
    ),
    uploadedBy: uuid('uploaded_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('documents_tender_id_idx').on(t.tenderId),
    index('documents_source_parent_doc_id_idx').on(t.sourceParentDocId),
    index('documents_uploaded_by_idx').on(t.uploadedBy),
  ],
);

// Tenancy is inherited via the parent tender (amendments.tenderId); no own
// organizationId column.
export const amendments = pgTable(
  'amendments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenderId: uuid('tender_id')
      .notNull()
      .references(() => tenders.id),
    detectedAt: timestamp('detected_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    diff: jsonb('diff').notNull(),
    affectsDeadline: boolean('affects_deadline').notNull().default(false),
  },
  (t) => [index('amendments_tender_id_idx').on(t.tenderId)],
);

// Tenancy is inherited via the parent tender (assignments.tenderId); no own
// organizationId column.
export const assignments = pgTable(
  'assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenderId: uuid('tender_id')
      .notNull()
      .references(() => tenders.id),
    picId: uuid('pic_id')
      .notNull()
      .references(() => users.id),
    workloadScore: numeric('workload_score').notNull(),
    reason: text('reason'),
    assignedAt: timestamp('assigned_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: text('status').notNull().default('ACTIVE'),
  },
  (t) => [
    index('assignments_tender_id_idx').on(t.tenderId),
    index('assignments_pic_id_idx').on(t.picId),
  ],
);
