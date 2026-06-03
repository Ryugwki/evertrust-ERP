'use client';

import { PageHeader } from '@/components/common/page-header';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MarketingDraftReview } from './marketing-draft-review';
import { MarketingReport } from './marketing-report';

// Marketing page: the RAG Agent's reply drafts awaiting human approval (the new
// "Draft review" surface, mock data for now) + the live Growth-Engine "Report"
// (real arsenal_runs data, unchanged). Draft review is the default tab.
export function MarketingView() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Marketing"
        description="RAG reply drafts awaiting approval, plus the Growth-Engine report."
      />
      <Tabs defaultValue="drafts" className="w-full">
        <TabsList>
          <TabsTrigger value="drafts">Draft review</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
        </TabsList>
        <TabsContent value="drafts" className="mt-4">
          <MarketingDraftReview />
        </TabsContent>
        <TabsContent value="report" className="mt-4">
          <MarketingReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
