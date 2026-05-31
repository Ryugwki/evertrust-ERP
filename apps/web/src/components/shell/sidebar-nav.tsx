'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Permission } from '@evertrust/shared';
import { useCan } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { NAV_ITEMS, type NavItem } from './nav-items';

// Left-rail navigation for the protected shell. Each link is gated by its read
// permission via useCan (UI affordance only — the API still enforces). The
// active route is highlighted by prefix match so detail pages keep their section lit.
export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 p-3" aria-label="Primary">
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} />
      ))}
    </nav>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  // Hooks can't be called conditionally, so gate inside a per-item component.
  // `permission: null` items (dashboard) are always visible to authed users.
  const allowed = useCan((item.permission ?? 'tenders:read') as Permission);
  if (item.permission !== null && !allowed) return null;

  const isActive =
    pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
      )}
    >
      <Icon className="size-4 shrink-0" />
      {item.label}
    </Link>
  );
}
