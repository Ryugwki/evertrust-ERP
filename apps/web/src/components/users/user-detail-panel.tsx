'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ExternalLink } from 'lucide-react';
import {
  DEPARTMENT_LABELS,
  Department,
  PERMISSIONS,
  POSITION_LABELS,
  Position,
  ROLE_LABELS,
  UserRole,
  effectivePermissions,
  permissionsForRole,
  type AdminUserDto,
  type Permission,
  type UpdateUserDto,
} from '@evertrust/shared';
import { useMe } from '@/hooks/use-auth';
import { useUpdateUser } from '@/hooks/use-admin-users';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ROLE_STYLES } from './role-styles';

const NONE = '__none__';

// The permission catalog grouped by resource (the part before ':') for the grid.
const PERMISSION_GROUPS: { resource: string; perms: Permission[] }[] = (() => {
  const map = new Map<string, Permission[]>();
  for (const p of PERMISSIONS) {
    const resource = p.split(':')[0]!;
    const arr = map.get(resource) ?? [];
    arr.push(p);
    map.set(resource, arr);
  }
  return [...map.entries()].map(([resource, perms]) => ({ resource, perms }));
})();

// How the permission set is being edited (mirrors the former edit dialog):
//  keep   — leave the user's stored permissions untouched (default)
//  reset  — follow the (possibly newly-picked) role's defaults => save null
//  custom — an explicit hand-picked set => save the array
type PermEdit =
  | { kind: 'keep' }
  | { kind: 'reset' }
  | { kind: 'custom'; set: Permission[] };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

// Inline detail/editor for the selected team member (right pane of the two-pane
// Users page). Edits role/position/department + the permission grid in one Save
// (PATCH /admin/users/:id); (de)activation is a separate immediate action. Role
// is locked for an existing Super Admin, who always keeps full access. Backed by
// real data — there is no hard-delete endpoint, so the danger zone deactivates.
export function UserDetailPanel({ user }: { user: AdminUserDto }) {
  const { data: me } = useMe();
  const update = useUpdateUser();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<UserRole>(user.role);
  const [position, setPosition] = useState<Position | null>(user.position);
  const [department, setDepartment] = useState<Department | null>(
    user.department,
  );
  const [permEdit, setPermEdit] = useState<PermEdit>({ kind: 'keep' });

  // Reset the form whenever the selected user (or its saved values) changes.
  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setPosition(user.position);
    setDepartment(user.department);
    setPermEdit({ kind: 'keep' });
  }, [user]);

  const roleLocked = user.role === 'SUPER_ADMIN';
  const formIsSuperAdmin = role === 'SUPER_ADMIN';
  const styles = ROLE_STYLES[user.role];
  // Email is the login identity — only a Super Admin may change it.
  const canEditEmail = me?.role === 'SUPER_ADMIN';

  const shown = useMemo<Set<Permission>>(() => {
    if (formIsSuperAdmin) return new Set(PERMISSIONS);
    if (permEdit.kind === 'custom') return new Set(permEdit.set);
    if (permEdit.kind === 'reset') return new Set(permissionsForRole(role));
    return new Set(effectivePermissions(user.role, user.permissions));
  }, [formIsSuperAdmin, permEdit, role, user]);

  const dirty =
    name !== user.name ||
    (canEditEmail && email !== user.email) ||
    role !== user.role ||
    position !== user.position ||
    department !== user.department ||
    permEdit.kind !== 'keep';

  function toggle(perm: Permission) {
    const next = new Set(shown);
    if (next.has(perm)) next.delete(perm);
    else next.add(perm);
    setPermEdit({ kind: 'custom', set: [...next] });
  }

  function onRoleChange(v: string) {
    setRole(v as UserRole);
    // Re-template permissions to the newly-picked role (follow-role).
    setPermEdit({ kind: 'reset' });
  }

  function save() {
    const patch: UpdateUserDto = { name, position, department };
    if (canEditEmail && email !== user.email) patch.email = email;
    if (!roleLocked) patch.role = role;
    if (!formIsSuperAdmin) {
      if (permEdit.kind === 'custom') patch.permissions = permEdit.set;
      else if (permEdit.kind === 'reset') patch.permissions = null;
      // 'keep' => leave permissions unchanged (omit)
    }
    update.mutate(
      { id: user.id, patch },
      {
        onSuccess: () => toast.success(`Saved changes to ${user.name}.`),
        onError: (e) => toast.error(e.message ?? 'Could not save changes.'),
      },
    );
  }

  // (De)activation. The API also enforces these guards.
  const isSelf = me?.id === user.id;
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const blockDeactivate = isSelf || isSuperAdmin;
  const blockReason = isSelf
    ? 'You cannot deactivate your own account'
    : isSuperAdmin
      ? 'A Super Admin cannot be deactivated'
      : undefined;

  function setActive(active: boolean) {
    update.mutate(
      { id: user.id, patch: { active } },
      {
        onSuccess: () =>
          toast.success(
            active ? `Reactivated ${user.name}.` : `Deactivated ${user.name}.`,
          ),
        onError: (e) => toast.error(e.message ?? 'Could not update the user.'),
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* identity header */}
      <div className="flex items-start gap-3">
        <Avatar className="size-12">
          <AvatarFallback className={cn('text-sm font-medium', styles.tint)}>
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold leading-tight">
              {user.name}
            </span>
            <Badge
              className={cn('gap-1.5 border-transparent font-medium', styles.tint)}
            >
              <span className={cn('size-1.5 rounded-full', styles.dot)} />
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
        <Button asChild variant="outline" size="sm">
          <Link href={`/users/${user.id}`}>
            View profile
            <ExternalLink className="ml-1 size-3.5" />
          </Link>
        </Button>
      </div>

      {/* details: name (any users:manage) + email (Super Admin only) */}
      <div className="flex flex-col gap-3">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Details
        </Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="detail-name" className="text-xs text-muted-foreground">
              Name
            </Label>
            <Input
              id="detail-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="detail-email"
              className="text-xs text-muted-foreground"
            >
              Email
            </Label>
            <Input
              id="detail-email"
              type="email"
              value={canEditEmail ? email : user.email}
              disabled={!canEditEmail}
              onChange={(e) => setEmail(e.target.value)}
            />
            {!canEditEmail ? (
              <p className="text-xs text-muted-foreground">
                Only a Super Admin can change email.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* access */}
      <div className="flex flex-col gap-3">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Access
        </Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Role</Label>
            <Select value={role} disabled={roleLocked} onValueChange={onRoleChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UserRole.options.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {roleLocked ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                🔒 Super Admin role is locked
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Position</Label>
            <Select
              value={position ?? NONE}
              onValueChange={(v) =>
                setPosition(v === NONE ? null : (v as Position))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— None —</SelectItem>
                {Position.options.map((p) => (
                  <SelectItem key={p} value={p}>
                    {POSITION_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Department</Label>
            <Select
              value={department ?? NONE}
              onValueChange={(v) =>
                setDepartment(v === NONE ? null : (v as Department))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— None —</SelectItem>
                {Department.options.map((d) => (
                  <SelectItem key={d} value={d}>
                    {DEPARTMENT_LABELS[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* permissions */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Permissions
          </Label>
          {!formIsSuperAdmin ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setPermEdit({ kind: 'reset' })}
            >
              Reset to role defaults
            </Button>
          ) : null}
        </div>
        {formIsSuperAdmin ? (
          <p className="text-xs text-muted-foreground">
            Super Admin always has full access — permissions aren&apos;t editable.
          </p>
        ) : null}
        <div className="flex max-h-72 flex-col gap-3 overflow-y-auto rounded-lg border p-3">
          {PERMISSION_GROUPS.map(({ resource, perms }) => (
            <div key={resource} className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                {resource}
              </span>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {perms.map((p) => {
                  const action = p.split(':')[1] ?? p;
                  return (
                    <label
                      key={p}
                      className={cn(
                        'flex cursor-pointer items-center gap-1.5 text-sm',
                        formIsSuperAdmin && 'cursor-default opacity-70',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={shown.has(p)}
                        disabled={formIsSuperAdmin}
                        onChange={() => toggle(p)}
                      />
                      {action}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={save}
            disabled={!dirty || update.isPending}
          >
            {update.isPending ? 'Saving…' : 'Save changes'}
          </Button>
          {dirty ? (
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
          ) : null}
        </div>
      </div>

      <Separator />

      {/* danger zone */}
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-destructive">
          Danger zone
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {user.active ? (
            <Button
              type="button"
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={blockDeactivate || update.isPending}
              title={blockReason}
              onClick={() => setActive(false)}
            >
              Deactivate user
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={update.isPending}
              onClick={() => setActive(true)}
            >
              Reactivate user
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            {blockReason ??
              'Deactivated accounts can’t log in. History is kept — accounts are never hard-deleted.'}
          </span>
        </div>
      </div>
    </div>
  );
}
