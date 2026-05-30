import { Controller, Get } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

// Demonstrates permission-based RBAC: the global PermissionsGuard blocks any
// principal whose role lacks `admin:config` (held by L1/L2) with a 403, while a
// principal that holds it passes through.
@Controller('admin')
export class AdminController {
  @RequirePermissions('admin:config')
  @Get('ping')
  ping(): { pong: true } {
    return { pong: true };
  }
}
