import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE } from '@/lib/env';

// Route prefixes that require an authenticated session. Add future ERP modules here.
const PROTECTED_PREFIXES = ['/dashboard'];

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  // Presence-only check: the cookie value is a JWT we don't verify at the edge
  // (the API is the source of truth). Missing cookie => treat as logged out.
  const hasSession = Boolean(request.cookies.get(AUTH_COOKIE)?.value);

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Already signed in but sitting on /login -> send to the dashboard.
  if (pathname === '/login' && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on app routes, but skip Next internals, the API route handlers, and static assets.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
