'use client';

import { ArrowRight } from 'lucide-react';
import { nextStates, type TenderDto, type TenderStatus } from '@evertrust/shared';
import { toast } from 'sonner';
import { useTransitionTender } from '@/hooks/use-tenders';
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
        {targets.map((to) => (
          <Button
            key={to}
            variant="outline"
            size="sm"
            disabled={transition.isPending}
            onClick={() => go(to)}
          >
            <ArrowRight />
            {STATUS_LABEL[to]}
          </Button>
        ))}
      </div>
    </Can>
  );
}
