import { Controller, Get } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';

// Demonstrates RBAC: the global RolesGuard blocks any non-ADMIN principal from
// this route with a 403, while ADMIN passes through.
@Controller('admin')
export class AdminController {
  @Roles('ADMIN')
  @Get('ping')
  ping(): { pong: true } {
    return { pong: true };
  }
}
