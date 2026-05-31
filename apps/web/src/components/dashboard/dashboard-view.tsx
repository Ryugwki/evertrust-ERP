'use client';

import { ShieldCheck } from 'lucide-react';
import { DEPARTMENT_LABELS, ROLE_LABELS } from '@evertrust/shared';
import { useMe } from '@/hooks/use-auth';
import { AppShell } from '@/components/shell/app-shell';
import { Can } from '@/components/auth/can';
import { LogoutButton } from '@/components/auth/logout-button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DeadlineAtRiskCard } from '@/components/tenders/deadline-at-risk-card';
import { UpdateNameForm } from './update-name-form';

// Dashboard content inside the shared AppShell (which owns the topbar, the left
// nav rail, and the stale-session -> logout handling). This view focuses purely
// on the dashboard's cards.
export function DashboardView() {
  const { data: user, isLoading, isError, error } = useMe();

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Your Evertrust operations workspace.
          </p>
        </div>

        {isLoading ? (
          <DashboardSkeleton />
        ) : isError ? (
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Could not load your account</CardTitle>
              <CardDescription>{error.message}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-start gap-3 text-sm text-muted-foreground">
              <p>
                Your session may have expired or the account is no longer available.
                Sign out and log in again.
              </p>
              <LogoutButton>Sign out</LogoutButton>
            </CardContent>
          </Card>
        ) : user ? (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Signed in as {user.name}
                  <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
                  {user.department ? (
                    <Badge variant="outline">
                      {DEPARTMENT_LABELS[user.department]}
                    </Badge>
                  ) : null}
                </CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                You are authenticated. This base shell is reused by every ERP module.
              </CardContent>
            </Card>
            <UpdateNameForm user={user} />

            {/* Phase 6 (R31): the "deadline at risk" operational frame — open
                tenders inside the T-2 window, most urgent first. */}
            <DeadlineAtRiskCard />

            {/* RBAC demo: this admin-only card renders only when the user's role
                grants `admin:config` (i.e. L1/L2). The <Can> boundary gates the
                UI; the API enforces the same permission server-side. */}
            <Can permission="admin:config">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-amber-500" />
                    Administration
                    <Badge variant="outline">L1 / L2</Badge>
                  </CardTitle>
                  <CardDescription>
                    Organization configuration and platform settings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Only roles with <code className="font-mono">admin:config</code> see
                  this section. Future config controls live here.
                </CardContent>
              </Card>
            </Can>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader className="gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-28 self-end" />
        </CardContent>
      </Card>
    </div>
  );
}
