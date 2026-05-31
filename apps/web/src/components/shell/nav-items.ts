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
// gates it; the sidebar renders an item only when useCan(permission) is true,
// except items with `permission: null` (always visible to any authed user, like
// the dashboard landing zone). One source of truth for the nav.
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  // null => always shown to authenticated users (dashboard). Otherwise the read
  // permission required to see the link.
  permission: Permission | null;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: null },
  { href: '/tenders', label: 'Tenders', icon: FileText, permission: 'tenders:read' },
  { href: '/suppliers', label: 'Suppliers', icon: Truck, permission: 'suppliers:read' },
  { href: '/customers', label: 'Customers', icon: Building2, permission: 'customers:read' },
  { href: '/growth-engine', label: 'Growth Engine', icon: Crosshair, permission: 'campaigns:read' },
  { href: '/users', label: 'Users', icon: Users, permission: 'users:manage' },
];
