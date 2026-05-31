'use client';

import { ROLE_LABELS, type UserRole } from '@evertrust/shared';
import { useAdminUsers } from '@/hooks/use-admin-users';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/page-header';
import { cn } from '@/lib/utils';
import { ROLE_ORDER, ROLE_STYLES } from './role-styles';
import { UsersTable } from './users-table';

// Growth-Engine-style page view: a header, a row of role tiles (live headcount
// per role + a one-line access reference — so the page reads as org composition,
// not just a table), then the editable team table.
export function UsersView() {
  const users = useAdminUsers();
  const data = users.data ?? [];
  const ready = !users.isLoading && !users.isError;
  const countFor = (role: UserRole) => data.filter((u) => u.role === role).length;
  const deptCount = new Set(
    data.map((u) => u.department).filter(Boolean),
  ).size;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="User Management"
        description="Manage your team's roles, positions, and departments."
        actions={
          ready ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{data.length}</span>{' '}
              member{data.length === 1 ? '' : 's'}
              {deptCount > 0 ? (
                <>
                  {' · '}
                  <span className="font-medium text-foreground">
                    {deptCount}
                  </span>{' '}
                  department{deptCount === 1 ? '' : 's'}
                </>
              ) : null}
            </p>
          ) : null
        }
      />

      {/* Role tiles: live headcount per tier + access reference. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ROLE_ORDER.map((role) => {
          const s = ROLE_STYLES[role];
          return (
            <div
              key={role}
              className="relative overflow-hidden rounded-lg border bg-card p-4"
            >
              <span className={cn('absolute inset-x-0 top-0 h-0.5', s.dot)} />
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className={cn('size-2 rounded-full', s.dot)} />
                  {ROLE_LABELS[role]}
                </span>
                <span className="text-2xl font-semibold tabular-nums leading-none">
                  {users.isLoading ? (
                    <Skeleton className="h-6 w-6" />
                  ) : (
                    countFor(role)
                  )}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {s.blurb}
              </p>
            </div>
          );
        })}
      </div>

      {/* Team table. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team</CardTitle>
          <CardDescription>
            Set each member&apos;s role, position, and department. Changes save the
            moment you pick a value.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : users.isError ? (
            <p className="text-sm text-destructive">
              Could not load users: {users.error.message}
            </p>
          ) : data.length > 0 ? (
            <UsersTable users={data} />
          ) : (
            <p className="text-sm text-muted-foreground">No team members yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
