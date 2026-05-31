'use client';

import { ExternalLink } from 'lucide-react';
import {
  ARSENAL_STAGE_META,
  type CampaignDto,
  type CampaignStatus,
} from '@evertrust/shared';
import { useCampaigns } from '@/hooks/use-campaigns';
import { Can } from '@/components/auth/can';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/tender-format';
import { ArsenalPipeline } from './arsenal-pipeline';
import { AimLaunchDialog } from './aim-launch-dialog';
import { ArsenalControls } from './arsenal-controls';
import { ArsenalRunsCard } from './arsenal-runs-card';
import { RunStageButton } from './run-stage-button';
import { DeleteCampaignButton } from './delete-campaign-button';

// PER_CAMPAIGN stages run against a single campaign, so their "Run" buttons live
// on each campaign row (GLOBAL stages live in the ArsenalControls panel).
const PER_CAMPAIGN_STAGES = Object.values(ARSENAL_STAGE_META).filter(
  (m) => m.scope === 'PER_CAMPAIGN',
);

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

// Growth Engine home: AIM launch control (write-gated) + the arsenal sequence
// visual + the launched-campaign history with deploy status.
export function GrowthEngineView() {
  const campaigns = useCampaigns();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Growth Engine</h1>
          <p className="text-sm text-muted-foreground">
            Set a target with AIM — Lock &amp; Load launches the outbound arsenal.
          </p>
        </div>
        <Can permission="campaigns:write">
          <AimLaunchDialog />
        </Can>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">The AIM sequence</CardTitle>
          <CardDescription>
            AIM provisions the campaign; the remaining stages run autonomously in
            n8n once it&apos;s deployed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ArsenalPipeline />
        </CardContent>
      </Card>

      <ArsenalControls />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Launched campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {campaigns.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : campaigns.isError ? (
            <p className="text-sm text-destructive">
              Could not load campaigns: {campaigns.error.message}
            </p>
          ) : campaigns.data && campaigns.data.length > 0 ? (
            <ul className="divide-y divide-border">
              {campaigns.data.map((c) => (
                <CampaignRow key={c.id} campaign={c} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              You haven&apos;t aimed yet — click{' '}
              <span className="font-medium">AIM</span> to launch your first
              campaign.
            </p>
          )}
        </CardContent>
      </Card>

      <ArsenalRunsCard />
    </div>
  );
}

function CampaignRow({ campaign: c }: { campaign: CampaignDto }) {
  const s = STATUS_BADGE[c.status];
  return (
    <li className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium" title={c.project}>
            {c.name || c.project}
          </span>
          <Badge variant="outline" className={cn('font-medium', s.className)}>
            {s.label}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {c.niche} · {c.target} · {c.state}, {c.country} ·{' '}
          {formatDateTime(c.createdAt)}
        </p>
        {c.status === 'FAILED' && c.deployError ? (
          <p className="mt-1 text-xs text-destructive">{c.deployError}</p>
        ) : null}
        <Can permission="campaigns:write">
          <div className="mt-2 flex flex-wrap gap-2">
            {PER_CAMPAIGN_STAGES.map((m) => (
              <RunStageButton
                key={m.stage}
                stage={m.stage}
                campaignId={c.id}
                label={m.label}
                variant="ghost"
              />
            ))}
          </div>
        </Can>
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
    </li>
  );
}
