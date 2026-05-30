import type { ListTendersQuery } from '@evertrust/shared';

// Central registry of TanStack Query keys so cache reads/invalidations stay in
// sync. Each resource exposes `all` (the invalidation root — invalidating it
// catches every list/detail under it), plus the specific list/detail keys.
export const queryKeys = {
  me: ['me'] as const,

  tenders: {
    all: ['tenders'] as const,
    list: (query?: ListTendersQuery) => ['tenders', 'list', query ?? {}] as const,
    detail: (id: string) => ['tenders', 'detail', id] as const,
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
