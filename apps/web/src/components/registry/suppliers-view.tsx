'use client';

import { Pencil, Plus } from 'lucide-react';
import { useSuppliers } from '@/hooks/use-suppliers';
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
import { SupplierDialog } from './supplier-dialog';

// Supplier registry: header + "New supplier" (write-gated) + a table with a
// write-gated per-row Edit. Columns: name, niches, capabilities, fit, contact.
export function SuppliersView() {
  const { data, isLoading, isError, error } = useSuppliers();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
          <p className="text-sm text-muted-foreground">
            Your supplier registry for matching and sourcing.
          </p>
        </div>
        <Can permission="suppliers:write">
          <SupplierDialog
            trigger={
              <Button>
                <Plus />
                New supplier
              </Button>
            }
          />
        </Can>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Could not load suppliers: {error.message}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No suppliers yet.
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Niches</TableHead>
                <TableHead>Capabilities</TableHead>
                <TableHead className="text-right">Fit</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>
                    <TagList items={supplier.niches} />
                  </TableCell>
                  <TableCell>
                    <TagList items={supplier.capabilities} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {supplier.fitScore ?? '—'}
                  </TableCell>
                  <TableCell className="max-w-[14rem] truncate text-muted-foreground">
                    {supplier.contact ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Can permission="suppliers:write">
                      <SupplierDialog
                        supplier={supplier}
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label="Edit supplier">
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

// Render a string[] as small badges, with a graceful dash when empty.
function TagList({ items }: { items: string[] }) {
  if (items.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Badge key={item} variant="secondary" className="font-normal">
          {item}
        </Badge>
      ))}
    </div>
  );
}
