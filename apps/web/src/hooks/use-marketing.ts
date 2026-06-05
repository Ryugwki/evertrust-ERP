'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  MarketingDraftListDto,
  SendDraftDto,
  SendDraftResultDto,
} from '@evertrust/shared';
import { ApiError, api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

// Marketing · RAG Draft Review. The queue is the EVERTRUST - RAG AGENT workflow's
// reviewable drafts (Gmail drafts not yet sent). Sending invalidates the queue so
// the sent draft drops out (its sheet row flips to SENT, which the read filters).
export function useMarketingDrafts() {
  return useQuery<MarketingDraftListDto, ApiError>({
    queryKey: queryKeys.marketing.drafts(),
    queryFn: ({ signal }) => api.marketing.listDrafts(signal),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useSendDraft() {
  const qc = useQueryClient();
  return useMutation<SendDraftResultDto, ApiError, SendDraftDto>({
    mutationFn: (input) => api.marketing.sendDraft(input),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: queryKeys.marketing.all }),
  });
}
