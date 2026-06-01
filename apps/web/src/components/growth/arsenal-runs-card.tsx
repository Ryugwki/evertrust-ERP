'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  ARSENAL_STAGE_META,
  type ArsenalRunDto,
  type ArsenalRunStatus,
} from '@evertrust/shared';
import { useArsenalRuns } from '@/hooks/use-arsenal';
import { useCampaigns } from '@/hooks/use-campaigns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

// The live feed shows at most this many runs per page (client-side paging over the
// recent runs the API returns, newest-first).
const PAGE_SIZE = 10;

const RUN_STATUS: Record<ArsenalRunStatus, { label: string; className: string }> = {
  DISPATCHED: {
    label: 'Dispatched',
    className:
      'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  FAILED: {
    label: 'Failed',
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
};

// The live ERP→n8n hand-off feed (manual "Run now" + scheduled daily sends). Polls
// every ~15s via useArsenalRuns; the header shows when it last synced.
export function ArsenalRunsCard() {
  const runs = useArsenalRuns();
  const campaigns = useCampaigns();

  // campaignId → display name, so a run can name its campaign (best-effort).
  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of campaigns.data ?? []) m.set(c.id, c.name || c.project);
    return m;
  }, [campaigns.data]);

  const [page, setPage] = useState(0);
  const all = runs.data ?? [];
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  // Clamp: the feed polls live, so the list can shrink under the current page.
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = all.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          Live activity
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
        {runs.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : runs.isError ? (
          <p className="text-sm text-destructive">
            Could not load runs: {runs.error.message}
          </p>
        ) : all.length > 0 ? (
          <>
            <ul className="divide-y divide-border">
              {pageRows.map((r) => (
                <RunRow
                  key={r.id}
                  run={r}
                  campaignName={
                    r.campaignId ? nameById.get(r.campaignId) : undefined
                  }
                />
              ))}
            </ul>
            {totalPages > 1 ? (
              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <span className="text-xs text-muted-foreground">
                  Page {safePage + 1} of {totalPages} · {all.length} runs
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(0, safePage - 1))}
                    disabled={safePage === 0}
                  >
                    <ChevronLeft />
                    Prev
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
                    disabled={safePage >= totalPages - 1}
                  >
                    Next
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing to show yet — runs appear here once you fire a stage or the
            daily send goes out.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RunRow({
  run: r,
  campaignName,
}: {
  run: ArsenalRunDto;
  campaignName?: string;
}) {
  const s = RUN_STATUS[r.status];
  return (
    <li className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">
            {ARSENAL_STAGE_META[r.stage].label}
          </span>
          <Badge variant="outline" className={cn('font-medium', s.className)}>
            {s.label}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {r.source}
          </Badge>
          {campaignName ? (
            <span className="truncate text-xs text-muted-foreground">
              {campaignName}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {formatDateTime(r.createdAt)}
          {r.detail ? ` · ${r.detail}` : ''}
        </p>
      </div>
    </li>
  );
}
