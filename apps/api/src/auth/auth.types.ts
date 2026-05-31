import type { UserRole } from '@evertrust/shared';

// The decoded JWT payload we sign on login and verify on every guarded request.
// org carries the tenant so request handling can scope to it WITHOUT a DB lookup.
export interface JwtPayload {
  sub: string; // user id (uuid)
  role: UserRole;
  org: string; // organization id (uuid) — the tenant boundary
}

// What JwtStrategy.validate() returns and what gets attached to `req.user`.
// This is the authenticated principal used by guards, decorators, and audit.
// (`id` is kept as the existing field name; organizationId is the tenant.)
export interface AuthUser {
  id: string;
  role: UserRole;
  organizationId: string;
}
