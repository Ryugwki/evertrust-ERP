import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import type {
  IngestMeetingResultDto,
  MeetingDto,
  MeetingSyncResultDto,
} from '@evertrust/shared';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { OrgId } from '../common/tenant';
import { setAuditContext } from '../common/audit-context';
import { MeetingsService } from './meetings.service';
import {
  AnalyzeMeetingBodyDto,
  IngestMeetingBodyDto,
  LinkMeetingBodyDto,
} from './meetings.dto';

// Sales-Agent meetings (Read.ai analyses synced from n8n, campaign-attributed).
// Read = campaigns:read; sync + manual link = campaigns:write. Tenant-scoped.
@Controller('sales/meetings')
export class MeetingsController {
  constructor(
    private readonly meetings: MeetingsService,
    private readonly config: ConfigService,
  ) {}

  // n8n → ERP push of a completed analysis (after the workflow wrote the Drive
  // Doc + sheet). Token-guarded (x-arsenal-token), NOT JWT. Upserts by sessionId
  // so the ERP mirrors the Drive folder in real time.
  @Public()
  @Post('ingest')
  @HttpCode(HttpStatus.OK)
  ingest(
    @Body() body: IngestMeetingBodyDto,
    @Req() req: Request,
  ): Promise<IngestMeetingResultDto> {
    this.assertIngestToken(req);
    return this.meetings.ingest(body);
  }

  // Delete a meeting (e.g. a stale/test row with no Drive counterpart). AUDITED.
  @RequirePermissions('campaigns:write')
  @Delete(':id')
  async remove(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ id: string }> {
    const r = await this.meetings.remove(orgId, id);
    setAuditContext(req, { entity: 'meetings', entityId: id, action: 'DELETE' });
    return r;
  }

  // Constant-time check of the inbound ingest token (reuses ARSENAL_INGEST_TOKEN).
  // Blank = ingest disabled (503) until an operator mints a secret.
  private assertIngestToken(req: Request): void {
    const expected = this.config.get('ARSENAL_INGEST_TOKEN');
    if (!expected) {
      throw new ServiceUnavailableException(
        'Meeting ingest is not configured (set ARSENAL_INGEST_TOKEN).',
      );
    }
    const provided = req.header('x-arsenal-token') ?? '';
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid ingest token.');
    }
  }

  @RequirePermissions('campaigns:read')
  @Get()
  list(
    @OrgId() orgId: string,
    @Query('campaignId') campaignId?: string,
    @Query('ae') ae?: string,
    @Query('persona') persona?: string,
    @Query('search') search?: string,
    @Query('bucket') bucket?: string,
  ): Promise<MeetingDto[]> {
    return this.meetings.list(orgId, {
      campaignId,
      ae,
      persona,
      search,
      bucket,
    });
  }

  // Pull recent Sales-Agent executions from n8n → upsert meetings, resolving each
  // meeting's campaign by prospect email → lead. AUDITED.
  @RequirePermissions('campaigns:write')
  @Post('sync')
  async sync(
    @OrgId() orgId: string,
    @Req() req: Request,
  ): Promise<MeetingSyncResultDto> {
    const result = await this.meetings.sync(orgId);
    setAuditContext(req, { entity: 'meetings', action: 'SYNC', after: result });
    return result;
  }

  // Re-analyze a meeting's transcript under a chosen persona by name (runs on
  // the Sales Agent workflow: OpenAI GPT-5-mini + Drive persona). AUDITED.
  @RequirePermissions('campaigns:write')
  @Post(':id/analyze')
  async analyze(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: AnalyzeMeetingBodyDto,
    @Req() req: Request,
  ): Promise<MeetingDto> {
    const m = await this.meetings.analyze(orgId, id, body.persona);
    setAuditContext(req, {
      entity: 'meetings',
      entityId: id,
      action: 'ANALYZE',
      after: { persona: m.persona, score: m.score },
    });
    return m;
  }

  // Manually link a meeting to a campaign (or clear it). AUDITED.
  @RequirePermissions('campaigns:write')
  @Patch(':id')
  async link(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: LinkMeetingBodyDto,
    @Req() req: Request,
  ): Promise<MeetingDto> {
    const m = await this.meetings.link(orgId, id, body.campaignId);
    setAuditContext(req, {
      entity: 'meetings',
      entityId: id,
      action: 'UPDATE',
      after: { campaignId: m.campaignId, matchMethod: m.matchMethod },
    });
    return m;
  }
}
