'use client';

import { Pencil, Plus } from 'lucide-react';
import { useCustomers } from '@/hooks/use-customers';
import { Can } from '@/components/auth/can';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CustomerDialog } from './customer-dialog';

// Customer registry: header + "New customer" (write-gated) + a table with a
// write-gated per-row Edit. Columns: name, contact, niches.
export function CustomersView() {
  const { data, isLoading, isError, error } = useCustomers();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Your customer registry for tender attribution.
          </p>
        </div>
        <Can permission="customers:write">
          <CustomerDialog
            trigger={
              <Button>
                <Plus />
                New customer
              </Button>
            }
          />
        </Can>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Could not load customers: {error.message}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No customers yet.
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Niches</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="max-w-[16rem] truncate text-muted-foreground">
                    {customer.contact ?? '—'}
                  </TableCell>
                  <TableCell>
                    {customer.niches.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {customer.niches.map((n) => (
                          <Badge key={n} variant="secondary" className="font-normal">
                            {n}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Can permission="customers:write">
                      <CustomerDialog
                        customer={customer}
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label="Edit customer">
                            <Pencil />
                          </Button>
                        }
                      />
                    </Can>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
