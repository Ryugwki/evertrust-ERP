'use client';

import { useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useLogout, useMe } from '@/hooks/use-auth';
import { Topbar } from '@/components/shell/topbar';
import { Can } from '@/components/auth/can';
import { LogoutButton } from '@/components/auth/logout-button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UpdateNameForm } from './update-name-form';

export function DashboardView() {
  const { data: user, isLoading, isError, error } = useMe();
  const { mutate: doLogout } = useLogout();

  // If the session is invalid (401/403), clear the stale cookie and return to
  // /login *via logout*. A bare redirect would let middleware bounce us right back
  // here because the (stale) cookie is still present. For any other failure, the
  // error card below offers a manual "Sign out".
  useEffect(() => {
    if (isError && (error.status === 401 || error.status === 403)) {
      doLogout();
    }
  }, [isError, error, doLogout]);

  return (
    <div className="flex min-h-svh flex-col bg-muted/40">
      <Topbar user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Your Evertrust operations workspace.
            </p>
          </div>

          {isLoading ? (
            <DashboardSkeleton />
          ) : isError ? (
            <Card className="max-w-xl">
              <CardHeader>
                <CardTitle>Could not load your account</CardTitle>
                <CardDescription>{error.message}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-start gap-3 text-sm text-muted-foreground">
                <p>
                  Your session may have expired or the account is no longer available.
                  Sign out and log in again.
                </p>
                <LogoutButton>Sign out</LogoutButton>
              </CardContent>
            </Card>
          ) : user ? (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Signed in as {user.name}
                    <Badge variant="secondary">{user.role}</Badge>
                  </CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  You are authenticated. This base shell is reused by every ERP module.
                </CardContent>
              </Card>
              <UpdateNameForm user={user} />

              {/* RBAC demo: this admin-only card renders only when the user's role
                  grants `admin:config` (i.e. ADMIN). The <Can> boundary gates the
                  UI; the API enforces the same permission server-side. */}
              <Can permission="admin:config">
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-amber-500" />
                      Administration
                      <Badge variant="outline">ADMIN</Badge>
                    </CardTitle>
                    <CardDescription>
                      Organization configuration and platform settings.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Only roles with <code className="font-mono">admin:config</code> see
                    this section. Future config controls live here.
                  </CardContent>
                </Card>
              </Can>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader className="gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-28 self-end" />
        </CardContent>
      </Card>
    </div>
  );
}
