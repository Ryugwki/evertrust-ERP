'use client';

import { CheckCircle2, CircleDashed, Target, XCircle } from 'lucide-react';
import type { CampaignStatus } from '@evertrust/shared';
import { useCampaigns } from '@/hooks/use-campaigns';
import { Can } from '@/components/auth/can';
import { Skeleton } from '@/components/ui/skeleton';
import { StatTile } from '@/components/common/stat-tile';
import { AimLaunchDialog } from '@/components/growth/aim-launch-dialog';
import { SequenceStrip } from '@/components/growth/sequence-strip';

// Marketing → "Growth Engine" tab: AIM a new campaign (the targeting) + the arsenal
// as one ordered sequence. Mirrors the growth-engine page's launch surface, surfaced
// here so the whole acquisition funnel lives under one Marketing roof.
export function MarketingGrowthEngine() {
  const campaigns = useCampaigns();
  const data = campaigns.data ?? [];
  const ready = !campaigns.isLoading && !campaigns.isError;
  const countFor = (status: CampaignStatus) =>
    data.filter((c) => c.status === status).length;
  const tile = (value: number) =>
    campaigns.isLoading ? <Skeleton className="h-6 w-8" /> : value;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          AIM launches a campaign; the rest of the arsenal runs and stays in sync.
        </p>
        <Can permission="campaigns:write">
          <AimLaunchDialog />
        </Can>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Campaigns"
          value={tile(data.length)}
          hint={ready ? `${countFor('DRAFT')} awaiting deploy` : 'Total launched targets'}
          accent="bg-sky-400"
          icon={<Target className="size-4" />}
        />
        <StatTile
          label="Deployed"
          value={tile(countFor('DEPLOYED'))}
          hint="Running autonomously in n8n"
          accent="bg-emerald-400"
          icon={<CheckCircle2 className="size-4" />}
        />
        <StatTile
          label="Failed"
          value={tile(countFor('FAILED'))}
          hint={countFor('FAILED') > 0 ? 'Needs attention' : 'No deploy errors'}
          accent="bg-destructive"
          icon={<XCircle className="size-4" />}
        />
        <StatTile
          label="Draft"
          value={tile(countFor('DRAFT'))}
          hint="Provisioned, not yet deployed"
          accent="bg-amber-400"
          icon={<CircleDashed className="size-4" />}
        />
      </div>

      {/* The whole arsenal as one ordered sequence + the daily schedule. */}
      <SequenceStrip />
    </div>
  );
}
