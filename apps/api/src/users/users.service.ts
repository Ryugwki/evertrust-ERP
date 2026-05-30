import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { schema } from '@evertrust/db';
import type { MeDto, UserListItemDto } from '@evertrust/shared';
import { DB, type DbClient } from '../db/db.tokens';
import { tenantScope } from '../common/tenant';

export interface UpdateNameResult {
  before: { name: string };
  after: MeDto;
}

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: DbClient) {}

  // List the users in the caller's organization (id/name/email/role/lane only),
  // ordered by name. Tenant-scoped — never returns users from another org.
  // Used by the assignee picker; no credential/auth fields are selected.
  async listForOrg(orgId: string): Promise<UserListItemDto[]> {
    return this.db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
        lane: schema.users.lane,
      })
      .from(schema.users)
      .where(tenantScope(orgId, schema.users))
      .orderBy(asc(schema.users.name));
  }

  // Update the user's display name and return both the prior name (for the audit
  // `before`) and the full updated user (for the response + audit `after`).
  async updateName(userId: string, name: string): Promise<UpdateNameResult> {
    const existing = await this.db
      .select({ name: schema.users.name })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    const prev = existing[0];
    if (!prev) throw new NotFoundException('User not found');

    const updated = await this.db
      .update(schema.users)
      .set({ name })
      .where(eq(schema.users.id, userId))
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        role: schema.users.role,
        organizationId: schema.users.organizationId,
      });

    const after = updated[0];
    if (!after) throw new NotFoundException('User not found');

    return { before: { name: prev.name }, after };
  }
}
