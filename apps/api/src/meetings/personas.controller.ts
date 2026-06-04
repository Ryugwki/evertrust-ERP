import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { PersonaDto } from '@evertrust/shared';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { OrgId } from '../common/tenant';
import { setAuditContext } from '../common/audit-context';
import { PersonasService } from './personas.service';
import { CreatePersonaBodyDto } from './meetings.dto';

// Coaching personas (the lens the Sales analysis runs through). Read =
// campaigns:read; create/delete = campaigns:write. Tenant-scoped.
@Controller('sales/personas')
export class PersonasController {
  constructor(private readonly personas: PersonasService) {}

  @RequirePermissions('campaigns:read')
  @Get()
  list(@OrgId() orgId: string): Promise<PersonaDto[]> {
    return this.personas.list(orgId);
  }

  @RequirePermissions('campaigns:write')
  @Post()
  async create(
    @OrgId() orgId: string,
    @Body() body: CreatePersonaBodyDto,
    @Req() req: Request,
  ): Promise<PersonaDto> {
    const p = await this.personas.create(orgId, body);
    setAuditContext(req, {
      entity: 'personas',
      entityId: p.id,
      action: 'CREATE',
      after: { name: p.name },
    });
    return p;
  }

  @RequirePermissions('campaigns:write')
  @Delete(':id')
  async remove(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ id: string }> {
    const r = await this.personas.remove(orgId, id);
    setAuditContext(req, { entity: 'personas', entityId: id, action: 'DELETE' });
    return r;
  }
}
