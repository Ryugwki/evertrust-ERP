'use client';

import type { MeDto } from '@evertrust/shared';
import { UserMenu } from './user-menu';

// App shell topbar. Shows the product name and (when a user is loaded) the user
// menu with logout. Kept presentational; later modules drop nav in the middle.
export function Topbar({ user }: { user?: MeDto }) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <span className="text-sm font-semibold tracking-tight">Evertrust ERP</span>
        {user ? <UserMenu user={user} /> : null}
      </div>
    </header>
  );
}
