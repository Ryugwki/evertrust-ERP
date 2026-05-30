import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { documents, suppliers, tenders, users } from './core';
import {
  pricingStatusEnum,
  rygFlagEnum,
  supplierPriceSourceEnum,
} from './enums';

// Tenancy is inherited via the parent tender (lineItems.tenderId); no own
// organizationId column.
export const lineItems = pgTable(
  'line_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenderId: uuid('tender_id')
      .notNull()
      .references(() => tenders.id),
    sourceDocId: uuid('source_doc_id').references(() => documents.id),
    // self-reference: nested/grouped line items (e.g. parent position -> sub items)
    parentId: uuid('parent_id').references((): any => lineItems.id),
    position: text('position').notNull(),
    description: text('description').notNull(),
    longText: text('long_text'),
    qty: numeric('qty').notNull(),
    unit: text('unit').notNull(),
    spec: text('spec'),
    brand: text('brand'),
    std: text('std'),
    bidEp: numeric('bid_ep'),
    bidGp: numeric('bid_gp'),
  },
  (t) => [
    index('line_items_tender_id_idx').on(t.tenderId),
    index('line_items_source_doc_id_idx').on(t.sourceDocId),
    index('line_items_parent_id_idx').on(t.parentId),
  ],
);

// Tenancy is inherited via the parent line item / supplier (supplierPrices
// references both); no own organizationId column.
export const supplierPrices = pgTable(
  'supplier_prices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lineItemId: uuid('line_item_id')
      .notNull()
      .references(() => lineItems.id),
    supplierId: uuid('supplier_id')
      .notNull()
      .references(() => suppliers.id),
    price: numeric('price').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    source: supplierPriceSourceEnum('source').notNull(),
    confidence: numeric('confidence', { precision: 4, scale: 3 }).notNull(),
    marginEstimate: numeric('margin_estimate'),
    rygFlag: rygFlagEnum('ryg_flag').notNull(),
    matchedAt: timestamp('matched_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('supplier_prices_line_item_id_idx').on(t.lineItemId),
    index('supplier_prices_supplier_id_idx').on(t.supplierId),
  ],
);

// Tenancy is inherited via the parent tender (pricings.tenderId); no own
// organizationId column.
export const pricings = pgTable(
  'pricings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenderId: uuid('tender_id')
      .notNull()
      .references(() => tenders.id),
    status: pricingStatusEnum('status').notNull().default('DRAFT'),
    subtotal: numeric('subtotal').notNull(),
    margin: numeric('margin').notNull(),
    finalPrice: numeric('final_price').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    decidedBy: uuid('decided_by').references(() => users.id),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('pricings_tender_id_idx').on(t.tenderId),
    index('pricings_decided_by_idx').on(t.decidedBy),
  ],
);
