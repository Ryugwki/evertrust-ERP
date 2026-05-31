'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
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
import { useUpdateUser } from '@/hooks/use-admin-users';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

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

// How the permission set is being edited:
//  keep   — leave the user's stored permissions untouched (default)
//  reset  — follow the (possibly newly-picked) role's defaults => save null
//  custom — an explicit hand-picked set => save the array
type PermEdit =
  | { kind: 'keep' }
  | { kind: 'reset' }
  | { kind: 'custom'; set: Permission[] };

// Edit a member's role / position / department and freely toggle their individual
// permissions. Role is locked for an existing Super Admin; a Super Admin (current
// or newly-selected) always has full, non-editable access.
export function UserEditDialog({
  user,
  open,
  onOpenChange,
}: {
  user: AdminUserDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdateUser();
  const [role, setRole] = useState<UserRole>(user.role);
  const [position, setPosition] = useState<Position | null>(user.position);
  const [department, setDepartment] = useState<Department | null>(
    user.department,
  );
  const [permEdit, setPermEdit] = useState<PermEdit>({ kind: 'keep' });

  useEffect(() => {
    if (open) {
      setRole(user.role);
      setPosition(user.position);
      setDepartment(user.department);
      setPermEdit({ kind: 'keep' });
    }
  }, [open, user]);

  const roleLocked = user.role === 'SUPER_ADMIN';
  const formIsSuperAdmin = role === 'SUPER_ADMIN';

  // The permission set currently shown in the grid.
  const shown = useMemo<Set<Permission>>(() => {
    if (formIsSuperAdmin) return new Set(PERMISSIONS);
    if (permEdit.kind === 'custom') return new Set(permEdit.set);
    if (permEdit.kind === 'reset') return new Set(permissionsForRole(role));
    return new Set(effectivePermissions(user.role, user.permissions));
  }, [formIsSuperAdmin, permEdit, role, user]);

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
    const patch: UpdateUserDto = { position, department };
    if (!roleLocked) patch.role = role;
    if (!formIsSuperAdmin) {
      if (permEdit.kind === 'custom') patch.permissions = permEdit.set;
      else if (permEdit.kind === 'reset') patch.permissions = null;
      // 'keep' => leave permissions unchanged (omit)
    }

    update.mutate(
      { id: user.id, patch },
      {
        onSuccess: () => {
          toast.success(`Updated ${user.name}.`);
          onOpenChange(false);
        },
        onError: (e) => toast.error(e.message ?? 'Could not update the user.'),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {user.name}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>Role</Label>
              <Select
                value={role}
                disabled={roleLocked}
                onValueChange={onRoleChange}
              >
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
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Position</Label>
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
              <Label>Department</Label>
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

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Permissions</Label>
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
                Super Admin always has full access — permissions aren&apos;t
                editable.
              </p>
            ) : null}
            <div className="flex max-h-64 flex-col gap-3 overflow-y-auto rounded-lg border p-3">
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
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
