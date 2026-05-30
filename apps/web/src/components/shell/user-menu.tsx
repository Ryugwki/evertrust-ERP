'use client';

import { Building2, LogOut } from 'lucide-react';
import type { MeDto } from '@evertrust/shared';
import { useLogout } from '@/hooks/use-auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function UserMenu({ user }: { user: MeDto }) {
  const logout = useLogout();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2">
          <Avatar className="size-7">
            <AvatarFallback className="text-xs">{initials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
          <Badge variant="outline" className="hidden font-normal sm:inline-flex">
            {user.role}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="truncate font-medium">{user.name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
            <Building2 className="size-3.5 shrink-0" />
            {/* TODO: MeDto only carries organizationId, not the org name. Surface
                the real name once GET /auth/me (or an org endpoint) returns it. */}
            <span className="truncate">Organization</span>
            <Badge variant="secondary" className="ml-auto font-normal">
              {user.role}
            </Badge>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            disabled={logout.isPending}
            onSelect={(event) => {
              event.preventDefault();
              logout.mutate();
            }}
          >
            <LogOut />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
