'use client';

import type { MeDto } from '@evertrust/shared';
import { UserMenu } from './user-menu';
import { LogoutButton } from '@/components/auth/logout-button';

// App shell topbar. Shows the product name and the user menu (with logout) when a
// user is loaded. When no user is loaded — e.g. a stale/invalid session — it still
// renders a plain "Sign out" so logout is ALWAYS reachable from the shell.
export function Topbar({ user }: { user?: MeDto }) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <span className="text-sm font-semibold tracking-tight">Evertrust ERP</span>
        {user ? <UserMenu user={user} /> : <LogoutButton variant="ghost" size="sm" />}
      </div>
    </header>
  );
}
