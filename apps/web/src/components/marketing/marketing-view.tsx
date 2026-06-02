'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  CalendarRange,
  Crosshair,
  Loader2,
  MessagesSquare,
  Moon,
  Radar,
  RefreshCw,
  Send,
  Target,
  type LucideIcon,
} from 'lucide-react';
import {
  ARSENAL_METRIC_LABEL,
  ARSENAL_STAGE_META,
  STAGE_PRIMARY_METRIC,
  type ArsenalStage,
  type MarketingReportPeriod,
  type MarketingStageReportDto,
} from '@evertrust/shared';
import { useArsenalBackfill, useMarketingReport } from '@/hooks/use-arsenal';
import { useCampaigns } from '@/hooks/use-campaigns';
import { Can } from '@/components/auth/can';
import { PageHeader } from '@/components/common/page-header';
import { StatTile } from '@/components/common/stat-tile';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Sparkline } from './sparkline';

// Sentinel for the "all campaigns" option (Select can't use an empty value).
const ALL = 'all';

const PERIODS: { value: MarketingReportPeriod; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

const WINDOW_LABEL: Record<MarketingReportPeriod, string> = {
  day: 'Last 24 hours',
  week: 'Last 7 days',
  month: 'Last 30 days',
};

const STAGE_ICON: Record<ArsenalStage, LucideIcon> = {
  LEAD_SATELLITE: Radar,
  AMMO_FORGE: Crosshair,
  REACH_BAZOOKA: Send,
  REPLY_GLOCK: MessagesSquare,
  SLEEPER_GRENADE: Moon,
};

const pct = (r: number | null) => (r === null ? '—' : `${Math.round(r * 100)}%`);
const num = (n: number | null | undefined) =>
  n === null || n === undefined ? null : n.toLocaleString();

// The Marketing report: the Growth-Engine sequence as a Day/Week/Month report.
// Health (runs, success/error, trends) is live from arsenal_runs; the funnel
// (leads → emails → replies → meetings) is dashed/amber until n8n reports counts
// via the run callback `metrics` field.
export function MarketingView() {
  const [period, setPeriod] = useState<MarketingReportPeriod>('week');
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const query = useMarketingReport(period, campaignId);
  const data = query.data;
  const campaigns = useCampaigns();
  const campaignList = campaigns.data ?? [];
  const backfill = useArsenalBackfill();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Marketing"
        description="The Growth-Engine sequence as a report — health is live, the funnel fills in as n8n reports."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Can permission="campaigns:write">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => backfill.mutate()}
                disabled={backfill.isPending}
                title="Import recent runs + counts from n8n's execution history"
              >
                {backfill.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <RefreshCw />
                )}
                {backfill.isPending ? 'Syncing…' : 'Sync from n8n'}
              </Button>
            </Can>
            <Select
              value={campaignId ?? ALL}
              onValueChange={(v) => setCampaignId(v === ALL ? null : v)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All campaigns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All campaigns</SelectItem>
                {campaignList.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name || c.project}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {WINDOW_LABEL[period]}
            </span>
            <div className="inline-flex rounded-lg border bg-card p-0.5">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPeriod(p.value)}
                  className={cn(
                    'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                    period === p.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {query.isError ? (
        <p className="text-sm text-destructive">
          Could not load the report: {query.error.message}
        </p>
      ) : null}

      {backfill.isError ? (
        <p className="text-sm text-destructive">
          Sync failed: {backfill.error.message}
        </p>
      ) : backfill.data ? (
        <p className="text-xs text-muted-foreground">
          {backfill.data.configured
            ? `Synced from n8n — imported ${backfill.data.imported} run${backfill.data.imported === 1 ? '' : 's'} (scanned ${backfill.data.scanned}).`
            : 'n8n API not configured — set N8N_API_URL / N8N_API_KEY to sync.'}
        </p>
      ) : null}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Campaigns launched"
          value={query.isLoading ? <Skeleton className="h-6 w-8" /> : data?.kpis.campaignsLaunched ?? 0}
          hint={`Deployed · ${WINDOW_LABEL[period].toLowerCase()}`}
          accent="bg-sky-400"
          icon={<Target className="size-4" />}
        />
        <StatTile
          label="Sequence runs"
          value={query.isLoading ? <Skeleton className="h-6 w-8" /> : data?.kpis.totalRuns ?? 0}
          hint="All stages, this period"
          accent="bg-violet-400"
          icon={<CalendarRange className="size-4" />}
        />
        <StatTile
          label="Success rate"
          value={query.isLoading ? <Skeleton className="h-6 w-10" /> : pct(data?.kpis.successRate ?? null)}
          hint="ok ÷ total runs"
          accent="bg-emerald-400"
          icon={<CheckCircle2 className="size-4" />}
        />
        <StatTile
          label="Meetings booked"
          value={
            query.isLoading ? (
              <Skeleton className="h-6 w-8" />
            ) : (
              num(data?.kpis.meetingsBooked ?? null) ?? (
                <span className="text-amber-600 dark:text-amber-400">—</span>
              )
            )
          }
          hint={
            data && data.kpis.meetingsBooked === null
              ? 'awaiting n8n'
              : 'Funnel end'
          }
          accent={
            data && data.kpis.meetingsBooked === null
              ? 'bg-amber-400'
              : 'bg-emerald-400'
          }
          icon={<MessagesSquare className="size-4" />}
        />
      </div>

      {/* Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <FunnelStep label="Leads found" value={data?.funnel.leadsFound ?? null} />
              <FunnelStep label="Emails sent" value={data?.funnel.emailsSent ?? null} />
              <FunnelStep label="Replies" value={data?.funnel.repliesHandled ?? null} />
              <FunnelStep label="Meetings" value={data?.funnel.meetingsBooked ?? null} />
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Amber = awaiting n8n. These light up once each stage reports a
            <code className="mx-1 rounded bg-muted px-1">metrics</code>
            count via the run callback.
          </p>
        </CardContent>
      </Card>

      {/* Per-stage lanes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per stage</CardTitle>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : data ? (
            <div className="flex flex-col">
              {data.stages.map((s) => (
                <StageLane key={s.stage} stage={s} />
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function FunnelStep({ label, value }: { label: string; value: number | null }) {
  const empty = value === null;
  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        empty
          ? 'border-dashed border-amber-500/50 bg-amber-500/5'
          : 'border-sky-500/30 bg-sky-500/10',
      )}
    >
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          'mt-1 text-xl font-semibold tabular-nums',
          empty ? 'text-amber-600 dark:text-amber-400' : 'text-sky-700 dark:text-sky-300',
        )}
      >
        {empty ? '—' : value.toLocaleString()}
      </div>
      {empty ? <div className="text-[10px] text-amber-600 dark:text-amber-400">awaiting n8n</div> : null}
    </div>
  );
}

function StageLane({ stage: s }: { stage: MarketingStageReportDto }) {
  const Icon = STAGE_ICON[s.stage] ?? Crosshair;
  const hasError = s.errors > 0;
  const metricKey = STAGE_PRIMARY_METRIC[s.stage];
  const metricVal = s.metrics[metricKey];
  const metricLabel = ARSENAL_METRIC_LABEL[metricKey];

  return (
    <div className="flex items-center gap-4 overflow-x-auto border-t py-3 first:border-t-0">
      <div className="flex w-44 shrink-0 items-center gap-2">
        <span
          className={cn(
            'size-2 shrink-0 rounded-full',
            hasError ? 'bg-destructive' : 'bg-emerald-500',
          )}
        />
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-medium" title={ARSENAL_STAGE_META[s.stage].what}>
          {ARSENAL_STAGE_META[s.stage].label}
        </span>
      </div>

      <div className="w-32 shrink-0 text-xs tabular-nums text-muted-foreground">
        {s.runs} runs · {pct(s.successRate)} ok
      </div>

      {hasError ? (
        <Badge
          variant="outline"
          className="shrink-0 border-destructive/30 bg-destructive/10 text-[10px] text-destructive"
        >
          {s.errors} error{s.errors === 1 ? '' : 's'}
        </Badge>
      ) : null}

      <div className="min-w-0 flex-1 text-xs">
        {metricLabel}{' '}
        {metricVal === undefined ? (
          <span className="text-amber-600 dark:text-amber-400">— awaiting n8n</span>
        ) : (
          <span className="font-semibold text-sky-700 dark:text-sky-300 tabular-nums">
            {metricVal.toLocaleString()}
          </span>
        )}
      </div>

      <Sparkline values={s.trend} className="w-28 shrink-0" />
    </div>
  );
}
