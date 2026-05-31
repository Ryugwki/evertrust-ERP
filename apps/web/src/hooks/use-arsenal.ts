'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ArsenalRunDto,
  ArsenalSettingsDto,
  ArsenalStage,
  UpdateArsenalSettingsDto,
} from '@evertrust/shared';
import { ApiError, api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

// Arsenal trigger hooks. Recent runs is the ERP→n8n hand-off history; the run
// mutation fires a stage's webhook (server records + returns the run, whose status
// is DISPATCHED or FAILED). Every run invalidates the run history.

export function useArsenalRuns() {
  return useQuery<ArsenalRunDto[], ApiError>({
    queryKey: queryKeys.arsenal.runs(),
    queryFn: ({ signal }) => api.arsenal.listRuns(signal),
  });
}

export function useRunArsenalStage() {
  const queryClient = useQueryClient();
  return useMutation<
    ArsenalRunDto,
    ApiError,
    { stage: ArsenalStage; campaignId?: string }
  >({
    mutationFn: ({ stage, campaignId }) => api.arsenal.run(stage, { campaignId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.arsenal.runs() });
    },
  });
}

// The editable daily Bazooka send time.
export function useArsenalSettings() {
  return useQuery<ArsenalSettingsDto, ApiError>({
    queryKey: queryKeys.arsenal.settings(),
    queryFn: ({ signal }) => api.arsenal.getSettings(signal),
  });
}

// Set/clear the daily time. Seeds the settings cache with the saved value so the
// control reflects it immediately (the API also re-arms the scheduler).
export function useUpdateArsenalSettings() {
  const queryClient = useQueryClient();
  return useMutation<ArsenalSettingsDto, ApiError, UpdateArsenalSettingsDto>({
    mutationFn: (input) => api.arsenal.updateSettings(input),
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.arsenal.settings(), saved);
    },
  });
}
