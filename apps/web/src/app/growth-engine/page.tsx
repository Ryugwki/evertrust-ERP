'use client';

// Render on demand, never prerendered: protected per-tenant data fetched in the
// browser (TanStack Query). Middleware guards the route; useRequirePermission is
// the defence-in-depth second layer.
import { useRequirePermission } from '@/lib/permissions';
import { AppShell } from '@/components/shell/app-shell';
import { GrowthEngineView } from '@/components/growth/growth-engine-view';
import { Skeleton } from '@/components/ui/skeleton';

export default function GrowthEnginePage() {
  const { allowed, isLoading } = useRequirePermission('campaigns:read');

  return (
    <AppShell>
      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : allowed ? (
        <GrowthEngineView />
      ) : (
        <p className="text-sm text-muted-foreground">Redirecting…</p>
      )}
    </AppShell>
  );
}
