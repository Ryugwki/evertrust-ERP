import { Body, Controller, Get, Param, Patch, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { AdminUserDto } from '@evertrust/shared';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
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
    @Param('id') id: string,
    @Body() body: UpdateUserBodyDto,
    @Req() req: Request,
  ): Promise<AdminUserDto> {
    const { before, after } = await this.users.updateUser(orgId, id, body);

    setAuditContext(req, {
      entity: 'users',
      entityId: id,
      action: 'UPDATE',
      before,
      after: {
        role: after.role,
        position: after.position,
        department: after.department,
      },
    });

    return after;
  }
}
