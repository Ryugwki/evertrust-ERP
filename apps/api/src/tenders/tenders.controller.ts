import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { TenderDto } from '@evertrust/shared';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { OrgId } from '../common/tenant';
import { setAuditContext } from '../common/audit-context';
import { TendersService } from './tenders.service';
import {
  CreateTenderBodyDto,
  ListTendersQueryDto,
  TransitionTenderBodyDto,
  UpdateTenderBodyDto,
} from './tenders.dto';

// Tenant-scoped, permission-gated tender CRUD + lifecycle transitions. Tenancy
// comes from @OrgId() (the JWT's org), never from the client. Mutations stamp the
// request via setAuditContext so the global AuditInterceptor writes the
// audit_log row (entity 'tenders', entityId = the tender id).
@Controller('tenders')
export class TendersController {
  constructor(private readonly tenders: TendersService) {}

  @RequirePermissions('tenders:read')
  @Get()
  list(
    @OrgId() orgId: string,
    @Query() query: ListTendersQueryDto,
  ): Promise<TenderDto[]> {
    // The service returns Drizzle rows (Date timestamps); Nest JSON-serializes
    // them to the TenderDto wire shape (ISO strings) at the HTTP boundary.
    return this.tenders.list(orgId, query.status) as unknown as Promise<
      TenderDto[]
    >;
  }

  @RequirePermissions('tenders:read')
  @Get(':id')
  get(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TenderDto> {
    return this.tenders.get(orgId, id) as unknown as Promise<TenderDto>;
  }

  @RequirePermissions('tenders:write')
  @Post()
  async create(
    @OrgId() orgId: string,
    @Body() body: CreateTenderBodyDto,
    @Req() req: Request,
  ): Promise<TenderDto> {
    const tender = await this.tenders.create(orgId, body);
    setAuditContext(req, {
      entity: 'tenders',
      entityId: tender.id,
      action: 'CREATE',
      after: tender,
    });
    return tender as unknown as TenderDto;
  }

  @RequirePermissions('tenders:write')
  @Patch(':id')
  async update(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateTenderBodyDto,
    @Req() req: Request,
  ): Promise<TenderDto> {
    const { before, after } = await this.tenders.update(orgId, id, body);
    setAuditContext(req, {
      entity: 'tenders',
      entityId: after.id,
      action: 'UPDATE',
      before,
      after,
    });
    return after as unknown as TenderDto;
  }

  @RequirePermissions('tenders:transition')
  @Post(':id/transition')
  async transition(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: TransitionTenderBodyDto,
    @Req() req: Request,
  ): Promise<TenderDto> {
    const { before, after } = await this.tenders.transition(orgId, id, body.to);
    setAuditContext(req, {
      entity: 'tenders',
      entityId: after.id,
      action: 'TRANSITION',
      before: { status: before.status },
      after: { status: after.status },
    });
    return after as unknown as TenderDto;
  }
}
