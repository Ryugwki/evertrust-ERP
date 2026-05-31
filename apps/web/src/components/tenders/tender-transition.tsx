'use client';

import { ArrowRight } from 'lucide-react';
import {
  isSubmissionBlocked,
  nextStates,
  type TenderDto,
  type TenderStatus,
} from '@evertrust/shared';
import { toast } from 'sonner';
import { useTransitionTender } from '@/hooks/use-tenders';
import { useTenderApprovals } from '@/hooks/use-approvals';
import { Can } from '@/components/auth/can';
import { Button } from '@/components/ui/button';
import { STATUS_LABEL } from '@/lib/tender-format';
import { StatusBadge } from './status-badge';

// Lifecycle transition control. Offers EXACTLY the legal next states from the
// shared state machine (nextStates), each as a transition button gated by
// tenders:transition. Terminal states render a clear "no further transitions"
// note. On success the hook seeds the detail cache, so the page reflects the new
// status immediately.
export function TenderTransition({ tender }: { tender: TenderDto }) {
  const targets = nextStates(tender.status);
  const transition = useTransitionTender(tender.id);
  // Phase 6: the SAME approvals cache the approval card reads. Using the shared
  // isSubmissionBlocked rule, the →SUBMITTED affordance shown here cannot drift
  // from the gate the API enforces.
  const approvals = useTenderApprovals(tender.id);
  const hasCustomerApproval = (approvals.data ?? []).some(
    (a) => a.type === 'CUSTOMER' && a.status === 'APPROVED',
  );

  function go(to: TenderStatus) {
    transition.mutate(
      { to },
      {
        onSuccess: (updated) =>
          toast.success(`Moved to ${STATUS_LABEL[updated.status]}.`),
        onError: (error) =>
          toast.error(error.message ?? 'Transition failed.'),
      },
    );
  }

  if (targets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        <StatusBadge status={tender.status} /> is terminal — no further
        transitions.
      </p>
    );
  }

  return (
    <Can
      permission="tenders:transition"
      fallback={
        <p className="text-sm text-muted-foreground">
          You don&apos;t have permission to move this tender.
        </p>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        {targets.map((to) => {
          const blocked = isSubmissionBlocked(to, hasCustomerApproval);
          return (
            <Button
              key={to}
              variant="outline"
              size="sm"
              disabled={transition.isPending || blocked}
              title={
                blocked
                  ? 'Customer approval must be recorded before submission'
                  : undefined
              }
              onClick={() => go(to)}
            >
              <ArrowRight />
              {STATUS_LABEL[to]}
            </Button>
          );
        })}
      </div>
      {isSubmissionBlocked('SUBMITTED', hasCustomerApproval) &&
      targets.includes('SUBMITTED') ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Submission is blocked until a customer approval is recorded — see
          “Customer Approval” below.
        </p>
      ) : null}
    </Can>
  );
}
