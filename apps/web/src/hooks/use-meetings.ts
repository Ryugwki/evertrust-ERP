'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MeetingDto, MeetingSyncResultDto } from '@evertrust/shared';
import { ApiError, api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export type MeetingFilters = {
  campaignId?: string;
  ae?: string;
  persona?: string;
  search?: string;
  bucket?: string;
};

// Sales-Agent meetings synced from n8n. The page filters client-side (small
// per-org volume), so the list is fetched once; mutations invalidate it.
export function useMeetings(filters: MeetingFilters = {}) {
  return useQuery<MeetingDto[], ApiError>({
    queryKey: queryKeys.meetings.list(filters),
    queryFn: ({ signal }) => api.meetings.list(filters, signal),
  });
}

export function useSyncMeetings() {
  const qc = useQueryClient();
  return useMutation<MeetingSyncResultDto, ApiError, void>({
    mutationFn: () => api.meetings.sync(),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: queryKeys.meetings.all }),
  });
}

export function useLinkMeeting() {
  const qc = useQueryClient();
  return useMutation<
    MeetingDto,
    ApiError,
    { id: string; campaignId: string | null }
  >({
    mutationFn: ({ id, campaignId }) => api.meetings.link(id, campaignId),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: queryKeys.meetings.all }),
  });
}

// Re-analyze a meeting under a chosen persona (ERP-native, via Claude).
export function useAnalyzeMeeting() {
  const qc = useQueryClient();
  return useMutation<MeetingDto, ApiError, { id: string; personaId: string }>({
    mutationFn: ({ id, personaId }) => api.meetings.analyze(id, personaId),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: queryKeys.meetings.all }),
  });
}
