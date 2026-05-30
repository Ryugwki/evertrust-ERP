import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@evertrust/shared';

// Declares which roles may access a route. RolesGuard reads this and compares
// against the role in the verified JWT (e.g. @Roles('ADMIN') on /admin/ping).
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
