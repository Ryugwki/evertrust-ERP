import type { ListTendersQuery } from '@evertrust/shared';

// Central registry of TanStack Query keys so cache reads/invalidations stay in
// sync. Each resource exposes `all` (the invalidation root — invalidating it
// catches every list/detail under it), plus the specific list/detail keys.
export const queryKeys = {
  me: ['me'] as const,

  // Org user directory (assignee picker).
  users: {
    all: ['users'] as const,
    list: () => ['users', 'list'] as const,
  },

  tenders: {
    all: ['tenders'] as const,
    list: (query?: ListTendersQuery) => ['tenders', 'list', query ?? {}] as const,
    detail: (id: string) => ['tenders', 'detail', id] as const,
    // Phase 4: the tender's ACTIVE assignment and its TYPE 1 documents.
    assignment: (id: string) => ['tenders', 'assignment', id] as const,
    documents: (id: string) => ['tenders', 'documents', id] as const,
    // Phase 5a: the tender's LV line items and its computed pricing view.
    lineItems: (id: string) => ['tenders', 'line-items', id] as const,
    pricing: (id: string) => ['tenders', 'pricing', id] as const,
  },

  // Phase 5a: a single line's price observations (keyed by line-item id).
  lineItems: {
    all: ['line-items'] as const,
    observations: (id: string) => ['line-items', 'observations', id] as const,
  },

  suppliers: {
    all: ['suppliers'] as const,
    list: () => ['suppliers', 'list'] as const,
    detail: (id: string) => ['suppliers', 'detail', id] as const,
  },

  customers: {
    all: ['customers'] as const,
    list: () => ['customers', 'list'] as const,
    detail: (id: string) => ['customers', 'detail', id] as const,
  },
};
