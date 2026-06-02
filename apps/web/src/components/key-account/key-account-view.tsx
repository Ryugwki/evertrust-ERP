'use client';

import { useState } from 'react';
import { Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import {
  LeadStageLabel,
  type LeadDto,
  type LeadStage,
} from '@evertrust/shared';
import {
  useClearLeads,
  useLeads,
  useLeadsBackfill,
  useRunHotLeadsPipeline,
} from '@/hooks/use-leads';
import { useCampaigns } from '@/hooks/use-campaigns';
import { Can } from '@/components/auth/can';
import { ConfirmButton } from '@/components/common/confirm-button';
import { PageHeader } from '@/components/common/page-header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/tender-format';
import { LeadDetailDialog } from './lead-detail-dialog';
import { AddLeadDialog } from './add-lead-dialog';

const ALL = 'all';

// The board columns (left → right pipeline). ARCHIVED leads are hidden.
const COLUMNS: { stage: LeadStage; accent: string }[] = [
  { stage: 'INTERESTED', accent: 'bg-sky-400' },
  { stage: 'MEETING_SCHEDULED', accent: 'bg-amber-400' },
  { stage: 'CUSTOMER', accent: 'bg-emerald-400' },
];

// Key Account hot-lead CRM: a board (Interested → Meeting Scheduled → Customer)
// fed by the n8n Hot Leads Pipeline (via Sync from n8n) + manual adds. Click a
// card to review it + convert to an ERP customer.
export function KeyAccountView() {
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [selected, setSelected] = useState<LeadDto | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const leads = useLeads({ campaignId: campaignId ?? undefined });
  const campaigns = useCampaigns();
  const backfill = useLeadsBackfill();
  const runPipeline = useRunHotLeadsPipeline();
  const clearLeads = useClearLeads();

  const list = leads.data ?? [];
  const campaignList = campaigns.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Key Account"
        description="Hot leads from the Arsenal — review, track, and graduate them to customers."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={campaignId ?? ALL}
              onValueChange={(v) => setCampaignId(v === ALL ? null : v)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All campaigns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All campaigns</SelectItem>
                {campaignList.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name || c.project}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Can permission="campaigns:write">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => backfill.mutate()}
                disabled={backfill.isPending}
                title="Import hot leads + graduated customers from n8n"
              >
                {backfill.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <RefreshCw />
                )}
                {backfill.isPending ? 'Syncing…' : 'Sync from n8n'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => runPipeline.mutate(campaignId ?? undefined)}
                disabled={runPipeline.isPending}
                title="Trigger the Hot Leads Pipeline in n8n"
              >
                {runPipeline.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : null}
                Run pipeline
              </Button>
              <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
                <Plus />
                Add lead
              </Button>
              <ConfirmButton
                trigger={
                  <Button type="button" variant="outline" size="sm">
                    <Trash2 />
                    Clear leads
                  </Button>
                }
                title="Clear all leads?"
                description="Deletes every hot lead in this CRM (linked customers are kept). Test-data reset — this can't be undone."
                confirmLabel="Clear leads"
                pending={clearLeads.isPending}
                onConfirm={() => clearLeads.mutate()}
              />
            </Can>
          </div>
        }
      />

      {leads.isError ? (
        <p className="text-sm text-destructive">
          Could not load leads: {leads.error.message}
        </p>
      ) : null}
      {backfill.isError ? (
        <p className="text-sm text-destructive">
          Sync failed: {backfill.error.message}
        </p>
      ) : backfill.data ? (
        <p className="text-xs text-muted-foreground">
          {backfill.data.configured
            ? `Synced from n8n — ${backfill.data.imported} lead${backfill.data.imported === 1 ? '' : 's'}, ${backfill.data.customers} new customer${backfill.data.customers === 1 ? '' : 's'} (scanned ${backfill.data.scanned}).`
            : 'n8n API not configured — set N8N_API_URL / N8N_API_KEY to sync.'}
        </p>
      ) : null}
      {runPipeline.data && !runPipeline.data.configured ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Hot Leads Pipeline webhook not configured (set
          N8N_HOT_LEADS_PIPELINE_WEBHOOK_URL).
        </p>
      ) : null}

      {leads.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const cards = list.filter((l) => l.stage === col.stage);
            return (
              <Card key={col.stage} className="flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <span className={cn('size-2 rounded-full', col.accent)} />
                    {LeadStageLabel[col.stage]}
                    <Badge variant="secondary" className="ml-auto">
                      {cards.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {cards.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      None
                    </p>
                  ) : (
                    cards.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        onClick={() => setSelected(lead)}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <LeadDetailDialog
        lead={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
      <AddLeadDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function LeadCard({ lead, onClick }: { lead: LeadDto; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted/40"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">
          {lead.companyName || lead.email}
        </span>
        {lead.tier ? (
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {lead.tier}
          </Badge>
        ) : null}
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground">
        {[lead.niche, lead.sourceCampaign].filter(Boolean).join(' · ') ||
          lead.email}
      </p>
      {lead.detectedAt ? (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {formatDateTime(lead.detectedAt)}
        </p>
      ) : null}
    </button>
  );
}
