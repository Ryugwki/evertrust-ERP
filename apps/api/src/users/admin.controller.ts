import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AdminUserDto } from '@evertrust/shared';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { OrgId } from '../common/tenant';
import { setAuditContext } from '../common/audit-context';
import { UsersService } from './users.service';
import { UpdateUserBodyDto } from './users.dto';

// Admin surface. RBAC is permission-based: the global PermissionsGuard 403s any
// principal whose role lacks the required permission. `admin:config` is held by
// Super Admin + Admin; `users:manage` (the user-management routes) by Super
// Admin only. Every route is tenant-scoped to the caller's organization.
@Controller('admin')
export class AdminController {
  constructor(private readonly users: UsersService) {}

  @RequirePermissions('admin:config')
  @Get('ping')
  ping(): { pong: true } {
    return { pong: true };
  }

  // User-management directory: full rows (incl. active + createdAt) for the
  // caller's org. Super Admin only (users:manage).
  @RequirePermissions('users:manage')
  @Get('users')
  listUsers(@OrgId() orgId: string): Promise<AdminUserDto[]> {
    return this.users.listAllForOrg(orgId);
  }

  // Change a user's role / position / department from the management table.
  // Super Admin only, tenant-scoped, and AUDITED (entity 'users', before/after
  // capture the changed fields) via the global AuditInterceptor.
  @RequirePermissions('users:manage')
  @Patch('users/:id')
  async updateUser(
    @OrgId() orgId: string,
    @CurrentUser() actingUser: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateUserBodyDto,
    @Req() req: Request,
  ): Promise<AdminUserDto> {
    // Email is the login identity — only a Super Admin may change it. Name and
    // the placement fields stay open to any users:manage holder.
    if (body.email !== undefined && actingUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Only a Super Admin can change a user’s email',
      );
    }

    const { before, after } = await this.users.updateUser(
      orgId,
      actingUser.id,
      id,
      body,
    );

    setAuditContext(req, {
      entity: 'users',
      entityId: id,
      action: 'UPDATE',
      before,
      after: {
        name: after.name,
        email: after.email,
        role: after.role,
        position: after.position,
        department: after.department,
        active: after.active,
      },
    });

    return after;
  }
}
