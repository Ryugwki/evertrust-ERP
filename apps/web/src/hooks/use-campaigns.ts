'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CampaignDto,
  CampaignSyncResultDto,
  CreateCampaignDto,
} from '@evertrust/shared';
import { ApiError, api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

// Growth Engine hooks. The list is the launched-campaign history; the create
// mutation is the AIM "Lock & Load" (it persists the campaign AND fires the AIM
// webhook server-side, so the returned row's status reflects the deploy outcome).

export function useCampaigns() {
  return useQuery<CampaignDto[], ApiError>({
    queryKey: queryKeys.campaigns.list(),
    queryFn: ({ signal }) => api.campaigns.list(signal),
    // Sync the sequence with deploy outcomes without a manual refresh.
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}

// Launch a campaign. Invalidates the campaign list so the new row (with its
// DEPLOYED / FAILED / DRAFT status) appears immediately.
export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation<CampaignDto, ApiError, CreateCampaignDto>({
    mutationFn: (input) => api.campaigns.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all });
    },
  });
}

// Delete a campaign (ERP record only). Invalidates the list so the row disappears.
export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.campaigns.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all });
    },
  });
}

// Sync the campaign list with the Drive "Evertrust Campaigns" folder (the source of
// truth): archives campaigns whose folder was deleted, un-archives ones that came
// back. Invalidates the list so archived rows drop out immediately.
export function useSyncCampaigns() {
  const queryClient = useQueryClient();
  return useMutation<CampaignSyncResultDto, ApiError, void>({
    mutationFn: () => api.campaigns.sync(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all });
    },
  });
}
