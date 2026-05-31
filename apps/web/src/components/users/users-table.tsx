'use client';

import { toast } from 'sonner';
import {
  DEPARTMENT_LABELS,
  Department,
  POSITION_LABELS,
  Position,
  ROLE_LABELS,
  UserRole,
  type AdminUserDto,
  type UpdateUserDto,
} from '@evertrust/shared';
import { useAdminUsers, useUpdateUser } from '@/hooks/use-admin-users';
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

// Radix Select forbids an empty-string item value; this sentinel = "clear to null"
// (a user with no position/department — e.g. a CEO who spans the company).
const NONE = '__none__';

// Option lists come straight from the shared Zod enums so the UI can never offer
// a value the API would reject.
const ROLE_OPTIONS = UserRole.options;
const POSITION_OPTIONS = Position.options;
const DEPARTMENT_OPTIONS = Department.options;

// User-management table: one row per teammate, with inline Role / Position /
// Department dropdowns that PATCH the change immediately (async, per cell). Role
// is required; position + department are clearable. Gated by users:manage on both
// the page and every API call.
export function UsersTable() {
  const users = useAdminUsers();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Team</CardTitle>
        <CardDescription>
          Set each member&apos;s role, position, and department. Changes save the
          moment you pick a value.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {users.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : users.isError ? (
          <p className="text-sm text-destructive">
            Could not load users: {users.error.message}
          </p>
        ) : users.data && users.data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Department</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.data.map((u) => (
                <UserRow key={u.id} user={u} />
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No team members yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function UserRow({ user }: { user: AdminUserDto }) {
  const update = useUpdateUser();
  const busy = update.isPending;

  function save(patch: UpdateUserDto) {
    update.mutate(
      { id: user.id, patch },
      {
        onError: (e) =>
          toast.error(e.message ?? `Could not update ${user.name}.`),
      },
    );
  }

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{user.name}</div>
        <div className="text-xs text-muted-foreground">{user.email}</div>
      </TableCell>

      <TableCell>
        <Select
          value={user.role}
          disabled={busy}
          onValueChange={(v) => save({ role: v as UserRole })}
        >
          <SelectTrigger size="sm" className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell>
        <Select
          value={user.position ?? NONE}
          disabled={busy}
          onValueChange={(v) =>
            save({ position: v === NONE ? null : (v as Position) })
          }
        >
          <SelectTrigger size="sm" className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— None —</SelectItem>
            {POSITION_OPTIONS.map((p) => (
              <SelectItem key={p} value={p}>
                {POSITION_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell>
        <Select
          value={user.department ?? NONE}
          disabled={busy}
          onValueChange={(v) =>
            save({ department: v === NONE ? null : (v as Department) })
          }
        >
          <SelectTrigger size="sm" className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— None —</SelectItem>
            {DEPARTMENT_OPTIONS.map((d) => (
              <SelectItem key={d} value={d}>
                {DEPARTMENT_LABELS[d]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
    </TableRow>
  );
}
