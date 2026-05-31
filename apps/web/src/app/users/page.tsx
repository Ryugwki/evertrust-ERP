'use client';

// Render on demand, never prerendered: protected per-tenant data fetched in the
// browser (TanStack Query). Middleware guards the route; useRequirePermission is
// the defence-in-depth second layer. Managing users is users:manage (Super Admin).
import { useRequirePermission } from '@/lib/permissions';
import { AppShell } from '@/components/shell/app-shell';
import { UsersTable } from '@/components/users/users-table';
import { Skeleton } from '@/components/ui/skeleton';

export default function UsersPage() {
  const { allowed, isLoading } = useRequirePermission('users:manage');

  return (
    <AppShell>
      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : allowed ? (
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              User Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your team&apos;s roles, positions, and departments.
            </p>
          </div>
          <UsersTable />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Redirecting…</p>
      )}
    </AppShell>
  );
}
