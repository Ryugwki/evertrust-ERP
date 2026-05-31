'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminUserDto, UpdateUserDto } from '@evertrust/shared';
import { ApiError, api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

// Admin user-management hooks (users:manage). The directory is the full user
// list; the update mutation PATCHes one user's role/position/department and keeps
// the table authoritative by seeding the saved row + invalidating the list.

export function useAdminUsers() {
  return useQuery<AdminUserDto[], ApiError>({
    queryKey: queryKeys.adminUsers.list(),
    queryFn: ({ signal }) => api.adminUsers.list(signal),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation<AdminUserDto, ApiError, { id: string; patch: UpdateUserDto }>({
    mutationFn: ({ id, patch }) => api.adminUsers.update(id, patch),
    onSuccess: (saved) => {
      queryClient.setQueryData<AdminUserDto[]>(queryKeys.adminUsers.list(), (prev) =>
        prev?.map((u) => (u.id === saved.id ? saved : u)),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers.all });
    },
  });
}
