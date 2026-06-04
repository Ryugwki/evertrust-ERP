'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreatePersonaDto, PersonaDto } from '@evertrust/shared';
import { ApiError, api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

// ERP-managed coaching personas (the lens the Sales analysis runs through).
export function usePersonas() {
  return useQuery<PersonaDto[], ApiError>({
    queryKey: queryKeys.personas.list(),
    queryFn: ({ signal }) => api.personas.list(signal),
  });
}

export function useCreatePersona() {
  const qc = useQueryClient();
  return useMutation<PersonaDto, ApiError, CreatePersonaDto>({
    mutationFn: (input) => api.personas.create(input),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: queryKeys.personas.all }),
  });
}

export function useDeletePersona() {
  const qc = useQueryClient();
  return useMutation<{ id: string }, ApiError, string>({
    mutationFn: (id) => api.personas.remove(id),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: queryKeys.personas.all }),
  });
}
