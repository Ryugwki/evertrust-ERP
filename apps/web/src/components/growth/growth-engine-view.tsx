'use client';

import { CheckCircle2, CircleDashed, Target, XCircle } from 'lucide-react';
import type { CampaignStatus } from '@evertrust/shared';
import { useCampaigns } from '@/hooks/use-campaigns';
import { useArsenalRuns } from '@/hooks/use-arsenal';
import { Can } from '@/components/auth/can';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/page-header';
import { StatTile } from '@/components/common/stat-tile';
import { AimLaunchDialog } from './aim-launch-dialog';
import { SequenceStrip } from './sequence-strip';
import { CampaignSequenceRow } from './campaign-sequence-row';
import { ArsenalRunsCard } from './arsenal-runs-card';

// Growth Engine home: the Arsenal as one systemized, synced sequence. AIM launch +
// deploy KPIs → the sequence strip (global stages + schedule) → each campaign's
// per-campaign slice of the sequence → the live run feed.
export function GrowthEngineView() {
  const campaigns = useCampaigns();
  const runs = useArsenalRuns();
  const runList = runs.data ?? [];
  const data = campaigns.data ?? [];
  const ready = !campaigns.isLoading && !campaigns.isError;
  const countFor = (status: CampaignStatus) =>
    data.filter((c) => c.status === status).length;
  const deployed = countFor('DEPLOYED');
  const failed = countFor('FAILED');
  const draft = countFor('DRAFT');
  const tile = (value: number) =>
    campaigns.isLoading ? <Skeleton className="h-6 w-8" /> : value;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Growth Engine"
        description="The outbound arsenal as one sequence — AIM launches it, the rest runs and stays in sync."
        actions={
          <Can permission="campaigns:write">
            <AimLaunchDialog />
          </Can>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Campaigns"
          value={tile(data.length)}
          hint={ready ? `${draft} awaiting deploy` : 'Total launched targets'}
          accent="bg-sky-400"
          icon={<Target className="size-4" />}
        />
        <StatTile
          label="Deployed"
          value={tile(deployed)}
          hint="Running autonomously in n8n"
          accent="bg-emerald-400"
          icon={<CheckCircle2 className="size-4" />}
        />
        <StatTile
          label="Failed"
          value={tile(failed)}
          hint={failed > 0 ? 'Needs attention' : 'No deploy errors'}
          accent="bg-destructive"
          icon={<XCircle className="size-4" />}
        />
        <StatTile
          label="Draft"
          value={tile(draft)}
          hint="Provisioned, not yet deployed"
          accent="bg-amber-400"
          icon={<CircleDashed className="size-4" />}
        />
      </div>

      {/* The whole arsenal as one ordered sequence + the daily schedule. */}
      <SequenceStrip />

      {/* Each campaign's per-campaign slice (AIM → prep pair), live from runs. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {campaigns.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : campaigns.isError ? (
            <p className="text-sm text-destructive">
              Could not load campaigns: {campaigns.error.message}
            </p>
          ) : data.length > 0 ? (
            <div className="flex flex-col gap-3">
              {data.map((c) => (
                <CampaignSequenceRow key={c.id} campaign={c} runs={runList} />
              ))}
            </div>
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
