import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { type Permission, ROLE_PERMISSIONS } from '@evertrust/shared';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import type { AuthUser } from '../auth.types';

// The RBAC authority. Registered globally AFTER JwtAuthGuard so req.user is
// populated. Expands the caller's role into its permission set via
// ROLE_PERMISSIONS (@evertrust/shared) and allows the request only if EVERY
// permission named by @RequirePermissions(...) is present. Routes without the
// decorator are authenticated-only (no permission restriction). Throws 403 on a
// missing permission (e.g. a non-ADMIN hitting /admin/ping which needs
// admin:config).
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<
      Permission[] | undefined
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    // No @RequirePermissions on this route => no permission restriction.
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as AuthUser | undefined;

    if (!user) throw new ForbiddenException('Insufficient permissions');

    const granted = ROLE_PERMISSIONS[user.role] ?? [];
    const hasAll = required.every((perm) => granted.includes(perm));
    if (!hasAll) throw new ForbiddenException('Insufficient permissions');

    return true;
  }
}
