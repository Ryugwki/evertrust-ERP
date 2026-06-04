'use client';

import { PageHeader } from '@/components/common/page-header';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MarketingFunnelBar } from './marketing-funnel-bar';
import { MarketingDraftReview } from './marketing-draft-review';
import { MarketingReport } from './marketing-report';
import { MarketingGrowthEngine } from './marketing-growth-engine';
import { MarketingCampaigns } from './marketing-campaigns';

// Marketing page: the whole acquisition funnel under one roof, four tabs —
// "Draft review" (RAG reply drafts awaiting human approval), "Report" (live
// Growth-Engine arsenal_runs report), "Growth Engine" (AIM launch + the arsenal
// sequence) and "Campaigns" (deployed-campaign tracking, Drive-synced). Draft
// review is the default tab.
export function MarketingView() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Marketing"
        description="AIM new campaigns, track what's deployed, review RAG drafts, and read the Growth-Engine report."
      />
      <MarketingFunnelBar />
      <Tabs defaultValue="drafts" className="w-full">
        <TabsList>
          <TabsTrigger value="drafts">Draft review</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
          <TabsTrigger value="growth">Growth Engine</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        </TabsList>
        <TabsContent value="drafts" className="mt-4">
          <MarketingDraftReview />
        </TabsContent>
        <TabsContent value="report" className="mt-4">
          <MarketingReport />
        </TabsContent>
        <TabsContent value="growth" className="mt-4">
          <MarketingGrowthEngine />
        </TabsContent>
        <TabsContent value="campaigns" className="mt-4">
          <MarketingCampaigns />
        </TabsContent>
      </Tabs>
    </div>
  );
}
