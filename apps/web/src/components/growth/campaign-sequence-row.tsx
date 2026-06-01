'use client';

import { Fragment } from 'react';
import { ChevronRight, ExternalLink } from 'lucide-react';
import {
  ARSENAL_STAGE_META,
  type ArsenalRunDto,
  type ArsenalStage,
  type CampaignDto,
  type CampaignStatus,
} from '@evertrust/shared';
import { Can } from '@/components/auth/can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/tender-format';
import {
  ARSENAL_SEQUENCE,
  aimStatus,
  isRunning,
  latestRunFor,
  timeAgo,
  type StageStatus,
} from '@/lib/arsenal-sequence';
import { StatusDot } from './status-dot';
import { RunStageButton } from './run-stage-button';
import { DeleteCampaignButton } from './delete-campaign-button';

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

// The per-campaign stages of the sequence (the "prep pair": Lead Satellite, Ammo
// Forge). AIM is rendered separately from the campaign's deploy status.
const PREP_STAGES: ArsenalStage[] =
  ARSENAL_SEQUENCE.find((s) => s.kind === 'pair')?.stages ?? [];

// One campaign as its slice of the sequence: AIM (from deploy status) → the prep
// pair (each node live from this campaign's runs, with an inline Run/Retry).
export function CampaignSequenceRow({
  campaign: c,
  runs,
}: {
  campaign: CampaignDto;
  runs: ArsenalRunDto[];
}) {
  const badge = STATUS_BADGE[c.status];
  const aim = aimStatus(c);

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium" title={c.project}>
              {c.name || c.project}
            </span>
            <Badge variant="outline" className={cn('font-medium', badge.className)}>
              {badge.label}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {c.niche} · {c.target} · {c.state}, {c.country} ·{' '}
            {formatDateTime(c.createdAt)}
          </p>
          {c.status === 'FAILED' && c.deployError ? (
            <p className="mt-1 text-xs text-destructive">{c.deployError}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {c.driveFolderUrl ? (
            <Button asChild variant="outline" size="sm">
              <a href={c.driveFolderUrl} target="_blank" rel="noreferrer">
                <ExternalLink />
                Drive
              </a>
            </Button>
          ) : null}
          <Can permission="campaigns:write">
            <DeleteCampaignButton campaign={c} />
          </Can>
        </div>
      </div>

      {/* This campaign's per-campaign sequence: AIM → Lead → Ammo */}
      <div className="mt-3 flex items-stretch gap-1.5 overflow-x-auto">
        <StageNode label="AIM" status={aim} sub={aimSub(c)} />
        {PREP_STAGES.map((stage) => {
          const st = latestRunFor(runs, stage, c.id);
          return (
            <Fragment key={stage}>
              <ChevronRight
                className={cn(
                  'size-4 shrink-0 self-center transition-colors',
                  isRunning(st)
                    ? 'animate-pulse text-emerald-500/80'
                    : 'text-muted-foreground/40',
                )}
              />
              <StageNode
                label={ARSENAL_STAGE_META[stage].label}
                status={st}
                running={isRunning(st)}
                action={
                  <Can permission="campaigns:write">
                    <RunStageButton
                      stage={stage}
                      campaignId={c.id}
                      label={st.outcome === 'failed' ? 'Retry' : 'Run'}
                      variant="ghost"
                      size="sm"
                    />
                  </Can>
                }
              />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function aimSub(c: CampaignDto): string {
  if (c.status === 'DEPLOYED') {
    return `launched ${timeAgo(c.deployedAt ?? c.createdAt)}`;
  }
  if (c.status === 'FAILED') return 'deploy failed';
  return 'draft';
}

function StageNode({
  label,
  status,
  sub,
  running,
  action,
}: {
  label: string;
  status: StageStatus;
  sub?: string | null;
  running?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex min-w-[7.5rem] flex-1 flex-col gap-1 rounded-md border bg-background p-2 transition-shadow',
        running && 'border-emerald-500/40 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]',
      )}
    >
      <div className="flex items-center gap-1.5">
        <StatusDot outcome={status.outcome} running={running} className="shrink-0" />
        <span className="truncate text-xs font-medium">{label}</span>
      </div>
      <div
        className={cn(
          'text-[11px]',
          running
            ? 'font-medium text-emerald-600 dark:text-emerald-400'
            : 'text-muted-foreground',
        )}
      >
        {running ? 'running in n8n…' : (sub ?? (status.at ? timeAgo(status.at) : 'idle'))}
      </div>
      {action ?? null}
    </div>
  );
}
