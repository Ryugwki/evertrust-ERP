'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Eye, Pencil, UserCheck, UserX } from 'lucide-react';
import type { AdminUserDto } from '@evertrust/shared';
import { useMe } from '@/hooks/use-auth';
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
import { UserDetailsDialog } from './user-details-dialog';
import { UserEditDialog } from './user-edit-dialog';

// The three per-row actions: Details (view), Edit (role/position/department), and
// Deactivate — or Reactivate when the user is already inactive. Deactivate is
// disabled for yourself and for a Super Admin (the API enforces the same), with a
// reason on hover.
export function UserRowActions({ user }: { user: AdminUserDto }) {
  const { data: me } = useMe();
  const update = useUpdateUser();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isSelf = me?.id === user.id;
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const blocked = isSelf || isSuperAdmin;
  const blockReason = isSelf
    ? 'You cannot deactivate your own account'
    : isSuperAdmin
      ? 'A Super Admin cannot be deactivated'
      : undefined;

  function setActive(active: boolean) {
    update.mutate(
      { id: user.id, patch: { active } },
      {
        onSuccess: () => {
          toast.success(
            active ? `Reactivated ${user.name}.` : `Deactivated ${user.name}.`,
          );
          setConfirmOpen(false);
        },
        onError: (e) => toast.error(e.message ?? 'Could not update the user.'),
      },
    );
  }

  return (
    <div className="flex items-center justify-end gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Details for ${user.name}`}
        onClick={() => setDetailsOpen(true)}
      >
        <Eye />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Edit ${user.name}`}
        onClick={() => setEditOpen(true)}
      >
        <Pencil />
      </Button>
      {user.active ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Deactivate ${user.name}`}
          title={blockReason}
          disabled={blocked || update.isPending}
          className="text-muted-foreground hover:text-destructive"
          onClick={() => setConfirmOpen(true)}
        >
          <UserX />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Reactivate ${user.name}`}
          disabled={update.isPending}
          className="text-muted-foreground hover:text-emerald-600"
          onClick={() => setActive(true)}
        >
          <UserCheck />
        </Button>
      )}

      <UserDetailsDialog
        user={user}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
      <UserEditDialog user={user} open={editOpen} onOpenChange={setEditOpen} />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate {user.name}?</DialogTitle>
            <DialogDescription>
              They&apos;ll no longer be able to log in or be assigned work. Their
              record and full history are kept — you can reactivate them anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={update.isPending}
              onClick={() => setActive(false)}
            >
              {update.isPending ? 'Deactivating…' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
