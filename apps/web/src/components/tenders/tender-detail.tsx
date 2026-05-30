'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { TenderDto } from '@evertrust/shared';
import { useTender } from '@/hooks/use-tenders';
import { useCustomer } from '@/hooks/use-customers';
import { Can } from '@/components/auth/can';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  REGIME_LABEL,
  formatDate,
  formatDateTime,
  formatValue,
} from '@/lib/tender-format';
import { StatusBadge } from './status-badge';
import { TenderTransition } from './tender-transition';
import { TenderEditDialog } from './tender-edit-dialog';
import { TenderAssigneeCard } from './tender-assignee-card';
import { TenderDocumentsCard } from './tender-documents-card';

// Tender detail surface: status shown prominently, all fields, a write-gated Edit
// dialog, and the transition control (only legal next states, each
// transition-gated). Refresh on transition/edit is handled by the mutation hooks
// seeding the detail cache.
export function TenderDetail({ id }: { id: string }) {
  const { data: tender, isLoading, isError, error } = useTender(id);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link
        href="/tenders"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Back to tenders
      </Link>

      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-lg" />
      ) : isError ? (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle>Could not load tender</CardTitle>
            <CardDescription>
              {error.status === 404
                ? 'This tender does not exist or is not in your organization.'
                : error.message}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : tender ? (
        <TenderDetailBody tender={tender} />
      ) : null}
    </div>
  );
}

function TenderDetailBody({ tender }: { tender: TenderDto }) {
  // Resolve the linked customer's name (best-effort; the field falls back to the
  // raw id if the lookup is unavailable).
  const customer = useCustomer(tender.customerId ?? undefined);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-3">
            <StatusBadge status={tender.status} className="text-sm" />
            <span className="font-mono text-xs text-muted-foreground">
              {tender.vergabeId} · {tender.source}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{tender.title}</h1>
        </div>
        <Can permission="tenders:write">
          <TenderEditDialog tender={tender} />
        </Can>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lifecycle</CardTitle>
          <CardDescription>
            Move this tender to its next valid state. Transitions are enforced by
            the shared state machine and audited.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TenderTransition tender={tender} />
        </CardContent>
      </Card>

      <TenderAssigneeCard tenderId={tender.id} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <Field label="Buyer" value={tender.buyer ?? '—'} />
            <Field
              label="Customer"
              value={
                tender.customerId
                  ? (customer.data?.name ?? tender.customerId)
                  : '—'
              }
            />
            <Field
              label="Regime"
              value={tender.regime ? REGIME_LABEL[tender.regime] : '—'}
            />
            <Field label="Niche" value={tender.niche ?? '—'} />
            <Field
              label="Estimated value"
              value={formatValue(tender.estimatedValue, tender.currency)}
            />
            <Field
              label="Above EU threshold"
              value={tender.isAboveThreshold ? 'Yes' : 'No'}
            />
            <Field label="Location" value={tender.location ?? '—'} />
            <Field label="Currency" value={tender.currency} />
            <Field
              label="Questions deadline"
              value={formatDate(tender.questionsDeadlineAt)}
            />
            <Field
              label="Submission deadline"
              value={formatDate(tender.submissionDeadlineAt)}
            />
            <Field label="Created" value={formatDateTime(tender.createdAt)} />
            <Field label="Updated" value={formatDateTime(tender.updatedAt)} />
          </dl>
        </CardContent>
      </Card>

      <TenderDocumentsCard tenderId={tender.id} />
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm" title={value}>
        {value}
      </dd>
    </div>
  );
}
