'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LayoutGrid, Plus, Table2 } from 'lucide-react';
import { TenderStatus, type TenderStatus as TenderStatusT } from '@evertrust/shared';
import { useTenders } from '@/hooks/use-tenders';
import { Can } from '@/components/auth/can';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { STATUS_ORDER } from '@/lib/tender-format';
import { TendersTable } from './tenders-table';
import { TendersBoard } from './tenders-board';

// "All" sentinel for the status <Select> — Radix Select items can't have an empty
// value, so we use a sentinel and map it back to "no filter".
const ALL = '__all__';

// Tenders module home: header + "New tender" (write-gated) + a status filter and
// a table/board toggle over the SAME filtered data. The status filter is applied
// server-side via the query so both views show the same rows.
export function TendersView() {
  const [status, setStatus] = useState<TenderStatusT | undefined>(undefined);
  const { data, isLoading, isError, error } = useTenders(
    status ? { status } : undefined,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tenders</h1>
          <p className="text-sm text-muted-foreground">
            Track every tender from detection to award.
          </p>
        </div>
        <Can permission="tenders:write">
          <Button asChild>
            <Link href="/tenders/new">
              <Plus />
              New tender
            </Link>
          </Button>
        </Can>
      </div>

      <Tabs defaultValue="table" className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Select
            value={status ?? ALL}
            onValueChange={(v) =>
              setStatus(v === ALL ? undefined : TenderStatus.parse(v))
            }
          >
            <SelectTrigger className="w-48" aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <TabsList>
            <TabsTrigger value="table">
              <Table2 />
              Table
            </TabsTrigger>
            <TabsTrigger value="board">
              <LayoutGrid />
              Board
            </TabsTrigger>
          </TabsList>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            Could not load tenders: {error.message}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            No tenders {status ? `in status ${status}` : 'yet'}.
          </div>
        ) : (
          <>
            <TabsContent value="table">
              <TendersTable tenders={data} />
            </TabsContent>
            <TabsContent value="board">
              <TendersBoard tenders={data} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
