import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { UserRole } from '@evertrust/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthUser } from '../auth.types';

// Registered globally AFTER JwtAuthGuard so req.user is populated. Enforces
// @Roles(...) where declared; routes without @Roles are unrestricted (any
// authenticated user). Throws 403 on role mismatch (e.g. non-ADMIN on /admin/*).
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles on this route => no role restriction.
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as AuthUser | undefined;

    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
