'use client';

import { Can } from '@/components/auth/can';
import { CampaignBoard } from '@/components/growth/campaign-board';
import { SyncDriveButton } from '@/components/growth/sync-drive-button';

// Marketing → "Campaigns" tab: track what Growth Engine has deployed. The Drive
// "Evertrust Campaigns" folder is the SOURCE OF TRUTH — "Sync with Drive" archives
// any campaign whose folder was deleted (so it drops out of the list instead of
// lingering on stale n8n run history).
export function MarketingCampaigns() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Deployed campaigns. The Drive folder is the source of truth — Sync archives
          any whose folder was deleted.
        </p>
        <Can permission="campaigns:write">
          <SyncDriveButton />
        </Can>
      </div>

      <CampaignBoard />
    </div>
  );
}
