import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { schema } from '@evertrust/db';
import type { CreatePersonaDto, PersonaDto } from '@evertrust/shared';
import { DB, type DbClient } from '../db/db.tokens';
import { tenantScope } from '../common/tenant';
import {
  DEFAULT_PERSONA_NAME,
  DEFAULT_PERSONA_PROMPT,
} from './meetings.analysis';

@Injectable()
export class PersonasService {
  constructor(@Inject(DB) private readonly db: DbClient) {}

  // The org's coaching personas, oldest first. Auto-provisions the default
  // "Alex Hormozi" persona the first time the org has none.
  async list(orgId: string): Promise<PersonaDto[]> {
    const rows = await this.db
      .select()
      .from(schema.personas)
      .where(tenantScope(orgId, schema.personas))
      .orderBy(asc(schema.personas.createdAt));
    if (rows.length === 0) {
      const created = await this.db
        .insert(schema.personas)
        .values({
          organizationId: orgId,
          name: DEFAULT_PERSONA_NAME,
          systemPrompt: DEFAULT_PERSONA_PROMPT,
        })
        .returning();
      return created.map((r) => this.toDto(r));
    }
    return rows.map((r) => this.toDto(r));
  }

  async create(orgId: string, dto: CreatePersonaDto): Promise<PersonaDto> {
    const rows = await this.db
      .insert(schema.personas)
      .values({
        organizationId: orgId,
        name: dto.name,
        systemPrompt: dto.systemPrompt,
      })
      .returning();
    return this.toDto(rows[0]!);
  }

  async remove(orgId: string, id: string): Promise<{ id: string }> {
    const scope = and(
      tenantScope(orgId, schema.personas),
      eq(schema.personas.id, id),
    );
    const existing = await this.db
      .select({ id: schema.personas.id })
      .from(schema.personas)
      .where(scope)
      .limit(1);
    if (!existing[0]) throw new NotFoundException('Persona not found');
    await this.db.delete(schema.personas).where(scope);
    return { id };
  }

  private toDto(r: typeof schema.personas.$inferSelect): PersonaDto {
    return {
      id: r.id,
      name: r.name,
      systemPrompt: r.systemPrompt,
      createdAt: new Date(r.createdAt).toISOString(),
    };
  }
}
