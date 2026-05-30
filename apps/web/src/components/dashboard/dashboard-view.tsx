'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMe } from '@/hooks/use-auth';
import { Topbar } from '@/components/shell/topbar';
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
  const router = useRouter();
  const { data: user, isLoading, isError, error } = useMe();

  // If the session is gone (401/403), bounce to login. Middleware also guards the
  // route, but this covers a token that expires while the page is open.
  useEffect(() => {
    if (isError && (error.status === 401 || error.status === 403)) {
      router.replace('/login');
    }
  }, [isError, error, router]);

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
            <Card>
              <CardHeader>
                <CardTitle>Could not load your account</CardTitle>
                <CardDescription>{error.message}</CardDescription>
              </CardHeader>
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
