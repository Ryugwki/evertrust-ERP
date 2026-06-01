'use client';

import { Fragment } from 'react';
import {
  ChevronRight,
  Crosshair,
  MessagesSquare,
  Moon,
  Radar,
  Send,
  type LucideIcon,
} from 'lucide-react';
import { useArsenalRuns, useArsenalSettings } from '@/hooks/use-arsenal';
import { useCampaigns } from '@/hooks/use-campaigns';
import { Can } from '@/components/auth/can';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  ARSENAL_SEQUENCE,
  type SequenceStep,
  type StageStatus,
  isRunning,
  latestRunFor,
  timeAgo,
} from '@/lib/arsenal-sequence';
import { StatusDot } from './status-dot';
import { RunStageButton } from './run-stage-button';
import { BazookaSchedule, zoneCity } from './bazooka-schedule';

const STEP_ICON: Record<string, LucideIcon> = {
  AIM: Crosshair,
  PREP: Radar,
  REACH_BAZOOKA: Send,
  REPLY_GLOCK: MessagesSquare,
  SLEEPER_GRENADE: Moon,
};

// The top "system" map: the whole Arsenal as one ordered, animated sequence. Steps
// 1–2 are per-campaign (status per campaign below); steps 3–5 are global, with live
// status + a Run button. A node pulses while it's dispatching / freshly running; the
// connector into a running step pulses too. The Bazooka node owns the daily schedule.
export function SequenceStrip() {
  const runs = useArsenalRuns();
  const settings = useArsenalSettings();
  const campaigns = useCampaigns();
  const runList = runs.data ?? [];
  const campaignCount = campaigns.data?.length ?? 0;
  const synced =
    !runs.isLoading && !runs.isError ? timeAgo(runs.dataUpdatedAt) || 'just now' : null;

  // Per global step: its latest status + whether it's "running" (recent dispatch).
  const stepStatus = (step: SequenceStep): StageStatus | null =>
    step.kind === 'stage' ? latestRunFor(runList, step.stages[0]!) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          The sequence
          {synced ? (
            <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              synced {synced}
            </span>
          ) : null}
        </CardTitle>
        <CardDescription>
          AIM launches a campaign; Lead Satellite &amp; Ammo Forge prep it; then the
          global send / reply / sweep run across all campaigns — automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1">
          {ARSENAL_SEQUENCE.map((step, i) => {
            const status = stepStatus(step);
            const running = status ? isRunning(status) : false;
            return (
              <Fragment key={step.key}>
                {i > 0 ? (
                  <ChevronRight
                    className={cn(
                      'size-4 shrink-0 self-center transition-colors',
                      running
                        ? 'animate-pulse text-emerald-500/80'
                        : 'text-muted-foreground/40',
                    )}
                  />
                ) : null}
                <StepNode
                  step={step}
                  index={i}
                  status={status}
                  running={running}
                  campaignCount={campaignCount}
                  bazookaAt={settings.data?.bazookaDailyAt ?? null}
                  bazookaTz={settings.data?.bazookaTimezone ?? null}
                />
              </Fragment>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          <span className="mr-1 inline-block rounded border border-dashed border-muted-foreground/50 px-1">
            dashed
          </span>
          per campaign (status shown per campaign below) ·
          <span className="mx-1 inline-block rounded border px-1">solid</span>
          global, fires across all campaigns · dot = last run
        </p>

        <BazookaSchedule />
      </CardContent>
    </Card>
  );
}

function StepNode({
  step,
  index,
  status,
  running,
  campaignCount,
  bazookaAt,
  bazookaTz,
}: {
  step: SequenceStep;
  index: number;
  status: StageStatus | null;
  running: boolean;
  campaignCount: number;
  bazookaAt: string | null;
  bazookaTz: string | null;
}) {
  const Icon = STEP_ICON[step.key] ?? Crosshair;
  const perCampaign = step.scope === 'PER_CAMPAIGN';
  const isBazooka = step.key === 'REACH_BAZOOKA';

  return (
    <div
      className={cn(
        'flex min-w-[8.5rem] flex-1 flex-col gap-1.5 rounded-lg border p-2.5 transition-shadow',
        perCampaign ? 'border-dashed bg-muted/20' : 'bg-card',
        running && 'border-emerald-500/40 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]',
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
          {index + 1}
        </span>
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        {status ? (
          <StatusDot
            outcome={status.outcome}
            running={running}
            className="ml-auto"
          />
        ) : null}
      </div>

      <div className="text-xs font-medium leading-tight">{step.label}</div>

      {perCampaign ? (
        <>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
            per campaign
          </div>
          <div className="mt-auto text-[11px] text-muted-foreground">
            {campaignCount > 0
              ? `${campaignCount} campaign${campaignCount === 1 ? '' : 's'} ↓`
              : 'no campaigns yet'}
          </div>
        </>
      ) : (
        <>
          <div
            className={cn(
              'text-[11px]',
              running
                ? 'font-medium text-emerald-600 dark:text-emerald-400'
                : 'text-muted-foreground',
            )}
          >
            {running
              ? 'running in n8n…'
              : status && status.at
                ? timeAgo(status.at)
                : 'no runs yet'}
          </div>
          {isBazooka ? (
            <Badge
              variant="outline"
              className={cn(
                'w-fit text-[10px]',
                bazookaAt
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'text-muted-foreground',
              )}
            >
              {bazookaAt ? `Daily ${bazookaAt} · ${zoneCity(bazookaTz)}` : 'Daily off'}
            </Badge>
          ) : null}
          <Can permission="campaigns:write">
            <RunStageButton
              stage={step.stages[0]!}
              label="Run"
              variant="ghost"
              size="sm"
            />
          </Can>
        </>
      )}
    </div>
  );
}
