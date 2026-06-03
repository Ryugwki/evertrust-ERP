'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  DEPARTMENT_LABELS,
  POSITION_LABELS,
  ROLE_LABELS,
  type AdminUserDto,
} from '@evertrust/shared';
import { useAdminUsers } from '@/hooks/use-admin-users';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/page-header';
import { cn } from '@/lib/utils';
import { ROLE_STYLES } from './role-styles';
import { UserCreateDialog } from './user-create-dialog';
import { UserDetailPanel } from './user-detail-panel';

type Filter = 'all' | 'admins' | 'managers' | 'employees' | 'inactive';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'admins', label: 'Admins' },
  { key: 'managers', label: 'Managers' },
  { key: 'employees', label: 'Employees' },
  { key: 'inactive', label: 'Inactive' },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

function matchesFilter(u: AdminUserDto, filter: Filter): boolean {
  switch (filter) {
    case 'admins':
      return u.role === 'ADMIN' || u.role === 'SUPER_ADMIN';
    case 'managers':
      return u.role === 'MANAGER';
    case 'employees':
      return u.role === 'EMPLOYEE';
    case 'inactive':
      return !u.active;
    default:
      return true;
  }
}

// Users page: a two-pane "Team & access" surface. Left = searchable, filterable
// roster (live from GET /admin/users); right = the selected member's inline
// editor (role / position / department / permissions + (de)activate). One source
// of truth — every edit PATCHes the real user and the list stays authoritative.
export function UsersView() {
  const users = useAdminUsers();
  const data = users.data ?? [];
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter(
      (u) =>
        matchesFilter(u, filter) &&
        (q === '' ||
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)),
    );
  }, [data, search, filter]);

  // The selected member: the explicit pick if still visible, else the first row.
  const selected =
    data.find((u) => u.id === selectedId) ?? filtered[0] ?? data[0] ?? null;
  const activeCount = data.filter((u) => u.active).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        description={
          users.isLoading
            ? 'Team & access'
            : `Team & access · ${data.length} member${
                data.length === 1 ? '' : 's'
              } · ${activeCount} active`
        }
        actions={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="size-4" />
            Add user
          </Button>
        }
      />

      {users.isError ? (
        <p className="text-sm text-destructive">
          Could not load users: {users.error.message}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
          {/* left: roster */}
          <Card className="self-start overflow-hidden">
            <div className="border-b p-3">
              <Input
                placeholder="Search name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs transition-colors',
                      filter === f.key
                        ? 'border-primary/40 bg-muted text-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {users.isLoading ? (
                <div className="flex flex-col gap-2 p-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No users match.
                </p>
              ) : (
                filtered.map((u) => {
                  const s = ROLE_STYLES[u.role];
                  const isSel = selected?.id === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedId(u.id)}
                      className={cn(
                        'flex w-full items-center gap-3 border-b px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-muted/50',
                        isSel && 'bg-muted',
                        !u.active && 'opacity-60',
                      )}
                    >
                      <Avatar className="size-9">
                        <AvatarFallback
                          className={cn('text-xs font-medium', s.tint)}
                        >
                          {initials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium leading-tight">
                          {u.name}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {u.department ? DEPARTMENT_LABELS[u.department] : '—'}
                          {u.position ? ` · ${POSITION_LABELS[u.position]}` : ''}
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          'shrink-0 gap-1 border-transparent text-[10px] font-medium',
                          s.tint,
                        )}
                      >
                        <span className={cn('size-1.5 rounded-full', s.dot)} />
                        {ROLE_LABELS[u.role]}
                      </Badge>
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          {/* right: detail / editor */}
          <Card>
            <CardContent className="pt-6">
              {users.isLoading ? (
                <Skeleton className="h-80 w-full" />
              ) : selected ? (
                <UserDetailPanel key={selected.id} user={selected} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No team members yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
