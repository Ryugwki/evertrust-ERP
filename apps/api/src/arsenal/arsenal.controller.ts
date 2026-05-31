import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ArsenalStage,
  type ArsenalRunDto,
  type ArsenalSettingsDto,
} from '@evertrust/shared';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { OrgId } from '../common/tenant';
import { setAuditContext } from '../common/audit-context';
import { ArsenalService } from './arsenal.service';
import { ArsenalScheduler } from './arsenal.scheduler';
import {
  RunArsenalBodyDto,
  UpdateArsenalSettingsBodyDto,
} from './arsenal.dto';

// Arsenal triggers: manual "Run now" for the outbound stages + the run history.
// Viewing runs is campaigns:read; firing a stage is campaigns:write (it sends real
// outbound work). Each run is recorded (arsenal_runs) and audited.
@Controller('arsenal')
export class ArsenalController {
  constructor(
    private readonly arsenal: ArsenalService,
    private readonly scheduler: ArsenalScheduler,
  ) {}

  @RequirePermissions('campaigns:read')
  @Get('runs')
  listRuns(@OrgId() orgId: string): Promise<ArsenalRunDto[]> {
    return this.arsenal.listRuns(orgId) as unknown as Promise<ArsenalRunDto[]>;
  }

  // The org's editable Growth-Engine settings (the daily Bazooka send time).
  @RequirePermissions('campaigns:read')
  @Get('settings')
  getSettings(@OrgId() orgId: string): Promise<ArsenalSettingsDto> {
    return this.arsenal.getSettings(orgId) as unknown as Promise<ArsenalSettingsDto>;
  }

  // Set/clear the daily Bazooka time (null = off). Persists AND re-arms the
  // scheduler immediately, so the change takes effect without a redeploy.
  @RequirePermissions('campaigns:write')
  @Put('settings')
  async updateSettings(
    @OrgId() orgId: string,
    @Body() body: UpdateArsenalSettingsBodyDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ): Promise<ArsenalSettingsDto> {
    const saved = await this.arsenal.updateSettings(
      orgId,
      {
        bazookaDailyAt: body.bazookaDailyAt,
        bazookaTimezone: body.bazookaTimezone,
      },
      user.id,
    );
    this.scheduler.applyForOrg(
      orgId,
      saved.bazookaDailyAt,
      saved.bazookaTimezone,
    );
    setAuditContext(req, {
      entity: 'arsenal_settings',
      entityId: orgId,
      action: 'UPDATE',
      after: saved,
    });
    return saved as unknown as ArsenalSettingsDto;
  }

  @RequirePermissions('campaigns:write')
  @Post(':stage/run')
  async run(
    @OrgId() orgId: string,
    @Param('stage') stageParam: string,
    @Body() body: RunArsenalBodyDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ): Promise<ArsenalRunDto> {
    // Validate the :stage path segment against the enum (it's not body-validated).
    const parsed = ArsenalStage.safeParse(stageParam);
    if (!parsed.success) {
      throw new BadRequestException(`Unknown arsenal stage: ${stageParam}`);
    }
    const run = await this.arsenal.run(orgId, parsed.data, {
      campaignId: body.campaignId,
      source: 'MANUAL',
      userId: user.id,
    });
    setAuditContext(req, {
      entity: 'arsenal_runs',
      entityId: run.id,
      action: 'RUN',
      after: run,
    });
    return run as unknown as ArsenalRunDto;
  }
}
