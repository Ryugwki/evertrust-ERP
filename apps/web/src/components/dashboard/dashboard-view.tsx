'use client';

import {
  AlarmClock,
  Crosshair,
  FileText,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import {
  DEPARTMENT_LABELS,
  ROLE_LABELS,
  type TenderDto,
} from '@evertrust/shared';
import { useMe } from '@/hooks/use-auth';
import { useTenders, useDeadlineRisk } from '@/hooks/use-tenders';
import { useCampaigns } from '@/hooks/use-campaigns';
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
import { PageHeader } from '@/components/common/page-header';
import { StatTile } from '@/components/common/stat-tile';
import { DeadlineAtRiskCard } from '@/components/tenders/deadline-at-risk-card';
import { UpdateNameForm } from './update-name-form';

// A tender is "open" until it reaches a terminal/submitted state — the SAME
// closed-set computeDeadlineRisk uses, so "active" here can't drift from what the
// deadline-risk roll-up considers still in play.
function isOpen(t: TenderDto): boolean {
  return (
    t.status !== 'SUBMITTED' && t.status !== 'AWARDED' && t.status !== 'LOST'
  );
}

// Dashboard content inside the shared AppShell (which owns the topbar, the left
// nav rail, and the stale-session -> logout handling). This view is the landing
// zone: a greeting masthead, a KPI row computed from the hooks the modules
// already use, then the operational frame (deadline-at-risk) + the profile form.
export function DashboardView() {
  const { data: user, isLoading, isError, error } = useMe();

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        {isLoading ? (
          <DashboardSkeleton />
        ) : isError ? (
          <>
            <PageHeader
              title="Dashboard"
              description="Your Evertrust operations workspace."
            />
            <Card className="max-w-xl">
              <CardHeader>
                <CardTitle>Could not load your account</CardTitle>
                <CardDescription>{error.message}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-start gap-3 text-sm text-muted-foreground">
                <p>
                  Your session may have expired or the account is no longer
                  available. Sign out and log in again.
                </p>
                <LogoutButton>Sign out</LogoutButton>
              </CardContent>
            </Card>
          </>
        ) : user ? (
          <>
            <PageHeader
              title={`Welcome back, ${user.name.split(/\s+/)[0] || user.name}`}
              description={
                <>
                  Your Evertrust operations workspace
                  {user.organizationName ? (
                    <>
                      {' · '}
                      <span className="text-foreground">
                        {user.organizationName}
                      </span>
                    </>
                  ) : null}
                </>
              }
              actions={
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
                  {user.department ? (
                    <Badge variant="outline">
                      {DEPARTMENT_LABELS[user.department]}
                    </Badge>
                  ) : null}
                </div>
              }
            />

            {/* KPI row: live operational counts from the hooks the Tenders +
                Growth modules already fetch. Each tile is gated by the same read
                permission as its source module (the API 403s otherwise), so the
                row only shows what this user is allowed to see. */}
            <StatRow />

            <div className="grid gap-6 md:grid-cols-2">
              {/* Phase 6 (R31): the "deadline at risk" operational frame — open
                  tenders inside the T-2 window, most urgent first. Gated by
                  tenders:read since it reads tender data. */}
              <Can permission="tenders:read">
                <DeadlineAtRiskCard />
              </Can>

              <UpdateNameForm user={user} />

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Account</CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  You are authenticated as{' '}
                  <span className="font-medium text-foreground">
                    {ROLE_LABELS[user.role]}
                  </span>
                  . This base shell is reused by every ERP module.
                </CardContent>
              </Card>

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
                    Only roles with{' '}
                    <code className="font-mono">admin:config</code> see this
                    section. Future config controls live here.
                  </CardContent>
                </Card>
              </Can>
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

// The KPI tiles. Hooks are called unconditionally (rules-of-hooks); each TILE is
// wrapped in <Can> so it renders only when the user can read that resource. A
// per-tile Skeleton holds the value until its query resolves (mirrors the Growth
// Engine pattern). All counts come from already-fetched data — no decorative
// endpoints.
function StatRow() {
  const tenders = useTenders();
  const atRisk = useDeadlineRisk();
  const campaigns = useCampaigns();

  const tenderRows = tenders.data ?? [];
  const totalTenders = tenderRows.length;
  const openTenders = tenderRows.filter(isOpen).length;

  const riskRows = atRisk.data ?? [];
  const atRiskCount = riskRows.length;
  const overdueCount = riskRows.filter((r) => r.risk.level === 'OVERDUE').length;

  const deployedCampaigns = (campaigns.data ?? []).filter(
    (c) => c.status === 'DEPLOYED',
  ).length;
  const totalCampaigns = campaigns.data?.length ?? 0;

  // Render a Skeleton in the value slot until the backing query settles.
  const num = (loading: boolean, value: number) =>
    loading ? <Skeleton className="h-6 w-8" /> : value;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Can permission="tenders:read">
        <StatTile
          label="Tenders"
          value={num(tenders.isLoading, totalTenders)}
          hint={
            tenders.isError
              ? 'Could not load'
              : `${openTenders} active right now`
          }
          accent="bg-sky-400"
          icon={<FileText className="size-4" />}
        />
      </Can>

      <Can permission="tenders:read">
        <StatTile
          label="Active"
          value={num(tenders.isLoading, openTenders)}
          hint="Open — not yet submitted or closed"
          accent="bg-emerald-400"
          icon={<Layers className="size-4" />}
        />
      </Can>

      <Can permission="tenders:read">
        <StatTile
          label="At deadline risk"
          value={num(atRisk.isLoading, atRiskCount)}
          hint={
            atRisk.isError
              ? 'Could not load'
              : overdueCount > 0
                ? `${overdueCount} overdue`
                : atRiskCount > 0
                  ? 'Within the T-2 window'
                  : 'All on track'
          }
          accent={atRiskCount > 0 ? 'bg-orange-400' : 'bg-emerald-400'}
          icon={<AlarmClock className="size-4" />}
        />
      </Can>

      <Can permission="campaigns:read">
        <StatTile
          label="Campaigns deployed"
          value={num(campaigns.isLoading, deployedCampaigns)}
          hint={
            campaigns.isError ? 'Could not load' : `${totalCampaigns} launched`
          }
          accent="bg-violet-400"
          icon={<Crosshair className="size-4" />}
        />
      </Can>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[92px] w-full rounded-lg" />
        ))}
      </div>
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
    </>
  );
}
