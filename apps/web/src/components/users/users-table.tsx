'use client';

import {
  DEPARTMENT_LABELS,
  PERMISSIONS,
  POSITION_LABELS,
  ROLE_LABELS,
  effectivePermissions,
  type AdminUserDto,
} from '@evertrust/shared';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/tender-format';
import { ROLE_STYLES } from './role-styles';
import { UserRowActions } from './user-row-actions';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

const TOTAL_PERMISSIONS = PERMISSIONS.length;

// Team table: one row per member. Role / position / department are read-only here
// (editing happens in the Edit dialog); the Permissions column shows how many of
// the org's permissions the role grants. Each row carries Details / Edit /
// Deactivate (or Reactivate) actions. Inactive members are greyed.
export function UsersTable({ users }: { users: AdminUserDto[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Position</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Permissions</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <UserRow key={u.id} user={u} />
        ))}
      </TableBody>
    </Table>
  );
}

function UserRow({ user }: { user: AdminUserDto }) {
  const role = ROLE_STYLES[user.role];
  const permCount = effectivePermissions(user.role, user.permissions).length;
  const inactive = !user.active;

  return (
    <TableRow className={cn(inactive && 'opacity-55')}>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback className={cn('text-xs font-medium', role.tint)}>
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium leading-tight">
                {user.name}
              </span>
              {inactive ? (
                <Badge
                  variant="outline"
                  className="px-1.5 py-0 text-[10px] text-muted-foreground"
                >
                  Inactive
                </Badge>
              ) : null}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {user.email}
            </div>
          </div>
        </div>
      </TableCell>

      <TableCell>
        <Badge className={cn('gap-1.5 border-transparent font-medium', role.tint)}>
          <span className={cn('size-1.5 rounded-full', role.dot)} />
          {ROLE_LABELS[user.role]}
        </Badge>
      </TableCell>

      <TableCell className="text-sm">
        {user.position ? (
          POSITION_LABELS[user.position]
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell className="text-sm">
        {user.department ? (
          DEPARTMENT_LABELS[user.department]
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell className="text-sm text-muted-foreground">
        <span className="font-medium tabular-nums text-foreground">
          {permCount}
        </span>{' '}
        <span className="text-xs">/ {TOTAL_PERMISSIONS}</span>
      </TableCell>

      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
        {formatDateTime(user.createdAt)}
      </TableCell>

      <TableCell className="text-right">
        <UserRowActions user={user} />
      </TableCell>
    </TableRow>
  );
}
