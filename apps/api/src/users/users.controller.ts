import { Body, Controller, Patch, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { MeDto } from '@evertrust/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { setAuditContext } from '../common/audit-context';
import { UsersService } from './users.service';
import { UpdateMyNameBodyDto } from './users.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // The demo AUDITED mutation. Updates the caller's name, then records the
  // before/after on the request so the global AuditInterceptor writes an
  // audit_log row (entity 'users', entityId = the user id, action UPDATE).
  @Patch('me')
  async updateMyName(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateMyNameBodyDto,
    @Req() req: Request,
  ): Promise<MeDto> {
    const { before, after } = await this.users.updateName(user.id, body.name);

    setAuditContext(req, {
      entity: 'users',
      entityId: user.id,
      action: 'UPDATE',
      before,
      after: { name: after.name },
    });

    return after;
  }
}
