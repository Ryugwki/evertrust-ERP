'use client';

import {
  ARSENAL_STAGE_META,
  type ArsenalRunDto,
  type ArsenalRunStatus,
} from '@evertrust/shared';
import { useArsenalRuns } from '@/hooks/use-arsenal';
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

// The ERP→n8n hand-off history (manual "Run now" + scheduled daily sends).
export function ArsenalRunsCard() {
  const runs = useArsenalRuns();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent arsenal runs</CardTitle>
      </CardHeader>
      <CardContent>
        {runs.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : runs.isError ? (
          <p className="text-sm text-destructive">
            Could not load runs: {runs.error.message}
          </p>
        ) : runs.data && runs.data.length > 0 ? (
          <ul className="divide-y divide-border">
            {runs.data.map((r) => (
              <RunRow key={r.id} run={r} />
            ))}
          </ul>
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

function RunRow({ run: r }: { run: ArsenalRunDto }) {
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
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {formatDateTime(r.createdAt)}
          {r.detail ? ` · ${r.detail}` : ''}
        </p>
      </div>
    </li>
  );
}
