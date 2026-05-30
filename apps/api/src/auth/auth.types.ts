import type { UserRole } from '@evertrust/shared';

// The decoded JWT payload we sign on login and verify on every guarded request.
export interface JwtPayload {
  sub: string; // user id (uuid)
  role: UserRole;
}

// What JwtStrategy.validate() returns and what gets attached to `req.user`.
// This is the authenticated principal used by guards, decorators, and audit.
export interface AuthUser {
  id: string;
  role: UserRole;
}
