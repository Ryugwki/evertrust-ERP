'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, XCircle } from 'lucide-react';
import {
  ARSENAL_STAGE_META,
  isArsenalRunOk,
  type ArsenalRunDto,
  type ArsenalRunStatus,
  type CampaignDto,
  type CampaignStatus,
} from '@evertrust/shared';
import { useArsenalRuns } from '@/hooks/use-arsenal';
import { useCampaigns } from '@/hooks/use-campaigns';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/tender-format';
import { timeAgo } from '@/lib/arsenal-sequence';

// At most this many activities shown inside one campaign's dropdown (newest first).
const MAX_ACTIVITIES = 10;
// Runs that carry no campaignId (global stages: Bazooka / Glock / Sleeper) are
// grouped under one synthetic row.
const GLOBAL_KEY = '__global__';

const STATUS_BADGE: Record<CampaignStatus, { label: string; className: string }> = {
  DRAFT: {
    label: 'Draft',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
  DEPLOYED: {
    label: 'Deployed',
    className:
      'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  FAILED: {
    label: 'Failed',
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
};

interface ActivityGroup {
  id: string;
  name: string;
  status: CampaignStatus | null; // null = the synthetic global group
  runs: ArsenalRunDto[];
  successCount: number;
  errorCount: number;
  lastAt: string | null;
}

// Group every run under its campaign (newest-first), plus a trailing "global"
// group for stage runs that aren't tied to a campaign. Campaigns with the most
// recent activity float to the top; idle ones sink.
function buildGroups(campaigns: CampaignDto[], runs: ArsenalRunDto[]): ActivityGroup[] {
  const byCampaign = new Map<string, ArsenalRunDto[]>();
  for (const r of runs) {
    const key = r.campaignId ?? GLOBAL_KEY;
    const list = byCampaign.get(key);
    if (list) list.push(r);
    else byCampaign.set(key, [r]);
  }

  const make = (
    id: string,
    name: string,
    status: CampaignStatus | null,
  ): ActivityGroup => {
    const list = (byCampaign.get(id) ?? [])
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    return {
      id,
      name,
      status,
      runs: list,
      successCount: list.filter((r) => isArsenalRunOk(r.status)).length,
      errorCount: list.filter((r) => !isArsenalRunOk(r.status)).length,
      lastAt: list[0]?.createdAt ?? null,
    };
  };

  const campaignGroups = campaigns
    .map((c) => make(c.id, c.name || c.project, c.status))
    .sort((a, b) => {
      const at = a.lastAt ? new Date(a.lastAt).getTime() : -1;
      const bt = b.lastAt ? new Date(b.lastAt).getTime() : -1;
      return bt - at;
    });

  const groups = [...campaignGroups];
  if ((byCampaign.get(GLOBAL_KEY) ?? []).length > 0) {
    groups.push(make(GLOBAL_KEY, 'Global stages · all campaigns', null));
  }
  return groups;
}

// The live ERP→n8n hand-off feed, grouped by campaign. Each campaign is a row you
// click to expand a dropdown of its latest activities (tagged success / error).
// `campaignId` (a campaign selected in the sequence above) auto-opens that row.
// Polls ~15s via useArsenalRuns; the header shows when it last synced.
export function ArsenalRunsCard({
  campaignId,
}: {
  campaignId?: string | null;
} = {}) {
  const runs = useArsenalRuns();
  const campaigns = useCampaigns();
  const [openId, setOpenId] = useState<string | null>(campaignId ?? null);

  // When a campaign is selected in the sequence above, open its dropdown here.
  useEffect(() => {
    if (campaignId) setOpenId(campaignId);
  }, [campaignId]);

  const groups = useMemo(
    () => buildGroups(campaigns.data ?? [], runs.data ?? []),
    [campaigns.data, runs.data],
  );

  const loading = runs.isLoading || campaigns.isLoading;
  const totalRuns = runs.data?.length ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span>Live activity</span>
          {!runs.isLoading && !runs.isError ? (
            <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              synced {timeAgo(runs.dataUpdatedAt) || 'just now'}
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : runs.isError ? (
          <p className="text-sm text-destructive">
            Could not load runs: {runs.error.message}
          </p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No campaigns yet — click <span className="font-medium">AIM</span> to
            launch one and its activity will show up here.
          </p>
        ) : (
          <>
            <p className="mb-2 text-xs text-muted-foreground">
              Click a campaign to see its latest activity.
            </p>
            <ul className="flex flex-col gap-1.5">
              {groups.map((g) => (
                <CampaignActivityRow
                  key={g.id}
                  group={g}
                  open={openId === g.id}
                  onToggle={() =>
                    setOpenId((p) => (p === g.id ? null : g.id))
                  }
                />
              ))}
            </ul>
            {totalRuns === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                No runs yet — activity appears here once a stage fires or the
                daily send goes out.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CampaignActivityRow({
  group,
  open,
  onToggle,
}: {
  group: ActivityGroup;
  open: boolean;
  onToggle: () => void;
}) {
  const badge = group.status ? STATUS_BADGE[group.status] : null;
  const hasActivity = group.runs.length > 0;
  const shown = group.runs.slice(0, MAX_ACTIVITIES);
  const hidden = group.runs.length - shown.length;

  return (
    <li
      className={cn(
        'overflow-hidden rounded-lg border bg-card transition-shadow',
        open && 'ring-1 ring-primary/40',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/40',
          open && 'bg-muted/30',
        )}
      >
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
        <span className="truncate text-sm font-medium" title={group.name}>
          {group.name}
        </span>
        {badge ? (
          <Badge variant="outline" className={cn('font-medium', badge.className)}>
            {badge.label}
          </Badge>
        ) : (
          <Badge variant="secondary" className="font-normal">
            global
          </Badge>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          {hasActivity ? (
            <>
              {group.successCount > 0 ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  {group.successCount}
                </span>
              ) : null}
              {group.errorCount > 0 ? (
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="size-3.5" />
                  {group.errorCount}
                </span>
              ) : null}
              <span className="hidden sm:inline">{timeAgo(group.lastAt)}</span>
            </>
          ) : (
            <span>no activity yet</span>
          )}
        </span>
      </button>

      {open ? (
        <div className="border-t bg-background/60 px-3 py-2">
          {hasActivity ? (
            <>
              <ul className="divide-y divide-border">
                {shown.map((r) => (
                  <ActivityRow key={r.id} run={r} />
                ))}
              </ul>
              {hidden > 0 ? (
                <p className="pt-2 text-[11px] text-muted-foreground">
                  +{hidden} older activit{hidden === 1 ? 'y' : 'ies'}
                </p>
              ) : null}
            </>
          ) : (
            <p className="py-1 text-xs text-muted-foreground">
              No activity yet — this campaign&apos;s stages (Lead Satellite, Ammo
              Forge) will appear here once they run.
            </p>
          )}
        </div>
      ) : null}
    </li>
  );
}

// How each run status reads in the feed. DISPATCHED/SUCCESS are "ok" outcomes;
// FAILED/ERROR are errors. N8N-sourced runs report SUCCESS/ERROR; ERP-dispatched
// ones report DISPATCHED/FAILED.
const RUN_STATUS_LABEL: Record<ArsenalRunStatus, string> = {
  DISPATCHED: 'Dispatched',
  SUCCESS: 'Success',
  FAILED: 'Failed',
  ERROR: 'Error',
};

function ActivityRow({ run: r }: { run: ArsenalRunDto }) {
  const ok = isArsenalRunOk(r.status);
  return (
    <li className="flex items-start gap-2 py-2 first:pt-1 last:pb-1">
      {ok ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
      ) : (
        <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">
            {ARSENAL_STAGE_META[r.stage].label}
          </span>
          <Badge
            variant="outline"
            className={cn(
              'font-medium',
              ok
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'border-destructive/30 bg-destructive/10 text-destructive',
            )}
          >
            {RUN_STATUS_LABEL[r.status]}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {r.source}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {formatDateTime(r.createdAt)}
          {r.detail ? ` · ${r.detail}` : ''}
        </p>
      </div>
    </li>
  );
}
