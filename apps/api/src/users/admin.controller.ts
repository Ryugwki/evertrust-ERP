import { Controller, Get } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

// Demonstrates permission-based RBAC: the global PermissionsGuard blocks any
// principal whose role lacks `admin:config` (only ADMIN holds it) with a 403,
// while an ADMIN passes through.
@Controller('admin')
export class AdminController {
  @RequirePermissions('admin:config')
  @Get('ping')
  ping(): { pong: true } {
    return { pong: true };
  }
}
