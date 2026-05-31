'use client';

import {
  DEPARTMENT_LABELS,
  POSITION_LABELS,
  ROLE_LABELS,
  effectivePermissions,
  type AdminUserDto,
} from '@evertrust/shared';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/tender-format';
import { ROLE_STYLES } from './role-styles';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

// Group permissions by resource (the part before ':') so the list reads as
// "tenders → read write transition" instead of a flat wall of strings.
function groupPermissions(perms: readonly string[]): [string, string[]][] {
  const map = new Map<string, string[]>();
  for (const p of perms) {
    const [resource, action] = p.split(':');
    const arr = map.get(resource!) ?? [];
    arr.push(action ?? resource!);
    map.set(resource!, arr);
  }
  return Array.from(map.entries());
}

export function UserDetailsDialog({
  user,
  open,
  onOpenChange,
}: {
  user: AdminUserDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const perms = effectivePermissions(user.role, user.permissions);
  const grouped = groupPermissions(perms);
  const role = ROLE_STYLES[user.role];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>User details</DialogTitle>
          <DialogDescription>
            Identity and role-derived access.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <Avatar className="size-12">
            <AvatarFallback className={cn('text-sm font-medium', role.tint)}>
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold">{user.name}</span>
              <Badge
                className={cn('gap-1.5 border-transparent font-medium', role.tint)}
              >
                <span className={cn('size-1.5 rounded-full', role.dot)} />
                {ROLE_LABELS[user.role]}
              </Badge>
              {!user.active ? (
                <Badge variant="outline" className="text-muted-foreground">
                  Inactive
                </Badge>
              ) : null}
            </div>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Field
            label="Position"
            value={user.position ? POSITION_LABELS[user.position] : '—'}
          />
          <Field
            label="Department"
            value={user.department ? DEPARTMENT_LABELS[user.department] : '—'}
          />
          <Field label="Status" value={user.active ? 'Active' : 'Inactive'} />
          <Field label="Joined" value={formatDateTime(user.createdAt)} />
        </dl>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Permissions ({perms.length})
            </p>
            {user.permissions ? (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                Custom
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
            {grouped.map(([resource, actions]) => (
              <div
                key={resource}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
              >
                <span className="w-24 shrink-0 font-medium capitalize">
                  {resource}
                </span>
                <div className="flex flex-wrap gap-1">
                  {actions.map((a) => (
                    <Badge
                      key={a}
                      variant="secondary"
                      className="px-1.5 py-0 text-[10px] font-normal"
                    >
                      {a}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
