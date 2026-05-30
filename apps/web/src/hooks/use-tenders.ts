'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateTenderDto,
  ListTendersQuery,
  TenderDto,
  TransitionTenderDto,
  UpdateTenderDto,
} from '@evertrust/shared';
import { ApiError, api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

// List of tenders for the current tenant, optionally filtered by status. The
// query key includes the filter so each filter is cached independently.
export function useTenders(query?: ListTendersQuery) {
  return useQuery<TenderDto[], ApiError>({
    queryKey: queryKeys.tenders.list(query),
    queryFn: ({ signal }) => api.tenders.list(query, signal),
  });
}

// A single tender by id. `enabled` is off for a falsy id so the detail page can
// call it unconditionally while route params resolve.
export function useTender(id: string | undefined) {
  return useQuery<TenderDto, ApiError>({
    queryKey: queryKeys.tenders.detail(id ?? ''),
    queryFn: ({ signal }) => api.tenders.get(id as string, signal),
    enabled: Boolean(id),
  });
}

// Create. Invalidates every tenders list so the new row appears on next view.
export function useCreateTender() {
  const queryClient = useQueryClient();
  return useMutation<TenderDto, ApiError, CreateTenderDto>({
    mutationFn: (input) => api.tenders.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tenders.all });
    },
  });
}

// Patch writable fields. Seeds the detail cache with the fresh row and
// invalidates lists so any list view reflects the edit.
export function useUpdateTender(id: string) {
  const queryClient = useQueryClient();
  return useMutation<TenderDto, ApiError, UpdateTenderDto>({
    mutationFn: (input) => api.tenders.update(id, input),
    onSuccess: (tender) => {
      queryClient.setQueryData(queryKeys.tenders.detail(id), tender);
      void queryClient.invalidateQueries({ queryKey: queryKeys.tenders.list() });
    },
  });
}

// Lifecycle transition. Same cache treatment as update — the status change must
// be reflected in both the detail and every list.
export function useTransitionTender(id: string) {
  const queryClient = useQueryClient();
  return useMutation<TenderDto, ApiError, TransitionTenderDto>({
    mutationFn: (input) => api.tenders.transition(id, input),
    onSuccess: (tender) => {
      queryClient.setQueryData(queryKeys.tenders.detail(id), tender);
      void queryClient.invalidateQueries({ queryKey: queryKeys.tenders.list() });
    },
  });
}
