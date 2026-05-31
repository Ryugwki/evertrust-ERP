import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { schema } from '@evertrust/db';
import type {
  AdminUserDto,
  Department,
  MeDto,
  Position,
  UpdateUserDto,
  UserListItemDto,
  UserRole,
} from '@evertrust/shared';
import { DB, type DbClient } from '../db/db.tokens';
import { tenantScope } from '../common/tenant';

export interface UpdateNameResult {
  before: { name: string };
  after: MeDto;
}

export interface UpdateUserResult {
  before: { role: UserRole; position: Position | null; department: Department | null };
  after: AdminUserDto;
}

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: DbClient) {}

  // List the users in the caller's organization (id/name/email/role + dept/
  // position), ordered by name. Tenant-scoped — never returns users from another
  // org. Used by the assignee picker; no credential/auth fields are selected.
  async listForOrg(orgId: string): Promise<UserListItemDto[]> {
    return this.db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
        department: schema.users.department,
        position: schema.users.position,
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

  // Full user directory for the management table (users:manage). Tenant-scoped.
  // createdAt is serialized to ISO so it matches the AdminUserDto wire shape.
  async listAllForOrg(orgId: string): Promise<AdminUserDto[]> {
    const rows = await this.db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
        position: schema.users.position,
        department: schema.users.department,
        active: schema.users.active,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(tenantScope(orgId, schema.users))
      .orderBy(asc(schema.users.name));
    return rows.map((r) => ({ ...r, createdAt: new Date(r.createdAt).toISOString() }));
  }

  // Update a user's role/position/department. Tenant-scoped on BOTH the prior
  // read (for the audit `before` + 404) and the write, so an admin can never
  // touch a user outside their organization. Only provided fields are changed;
  // position/department may be set to null to clear them.
  async updateUser(
    orgId: string,
    userId: string,
    dto: UpdateUserDto,
  ): Promise<UpdateUserResult> {
    const scope = and(
      tenantScope(orgId, schema.users),
      eq(schema.users.id, userId),
    );

    const existing = await this.db
      .select({
        role: schema.users.role,
        position: schema.users.position,
        department: schema.users.department,
      })
      .from(schema.users)
      .where(scope)
      .limit(1);

    const prev = existing[0];
    if (!prev) throw new NotFoundException('User not found');

    const patch: Partial<{
      role: UserRole;
      position: Position | null;
      department: Department | null;
    }> = {};
    if (dto.role !== undefined) patch.role = dto.role;
    if (dto.position !== undefined) patch.position = dto.position;
    if (dto.department !== undefined) patch.department = dto.department;

    const selection = {
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      position: schema.users.position,
      department: schema.users.department,
      active: schema.users.active,
      createdAt: schema.users.createdAt,
    };

    // Empty patch (no fields sent): return the current row unchanged.
    const rows =
      Object.keys(patch).length === 0
        ? await this.db.select(selection).from(schema.users).where(scope).limit(1)
        : await this.db
            .update(schema.users)
            .set(patch)
            .where(scope)
            .returning(selection);

    const after = rows[0];
    if (!after) throw new NotFoundException('User not found');

    return {
      before: prev,
      after: { ...after, createdAt: new Date(after.createdAt).toISOString() },
    };
  }
}
