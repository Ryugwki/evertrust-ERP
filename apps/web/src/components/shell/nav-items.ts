import {
  Building2,
  Crosshair,
  FileText,
  LayoutDashboard,
  Truck,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Permission } from '@evertrust/shared';

// The shell's primary navigation. Each item declares the read permission that
// gates it; the sidebar renders an item only when the user's role grants it,
// except items with `permission: null` (always visible to any authed user, like
// the dashboard landing zone). `group` is the sidebar section label — items
// sharing a group render together under it (kept contiguous + ordered here).
// One source of truth for the nav.
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  // null => always shown to authenticated users (dashboard). Otherwise the read
  // permission required to see the link.
  permission: Permission | null;
  // Sidebar section heading; omit for top-level (ungrouped) items.
  group?: string;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: null },
  { href: '/tenders', label: 'Tenders', icon: FileText, permission: 'tenders:read', group: 'Operations' },
  { href: '/suppliers', label: 'Suppliers', icon: Truck, permission: 'suppliers:read', group: 'Operations' },
  { href: '/customers', label: 'Customers', icon: Building2, permission: 'customers:read', group: 'Operations' },
  { href: '/growth-engine', label: 'Growth Engine', icon: Crosshair, permission: 'campaigns:read', group: 'Acquisition' },
  { href: '/users', label: 'Users', icon: Users, permission: 'users:manage', group: 'Administration' },
];
