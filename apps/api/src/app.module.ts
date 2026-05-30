import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppConfigModule } from './config/config.module';
import { LoggerModule } from './logger/logger.module';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TendersModule } from './tenders/tenders.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { CustomersModule } from './customers/customers.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { AuditInterceptor } from './common/audit.interceptor';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    DbModule,
    HealthModule,
    AuthModule,
    UsersModule,
    TendersModule,
    SuppliersModule,
    CustomersModule,
  ],
  providers: [
    // Zod DTOs are the contract: validate every request body/param/query.
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    // Global auth. ORDER MATTERS: authenticate first (populate req.user)...
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // ...then authorize by permission. PermissionsGuard is the single RBAC
    // authority: it expands the role -> permissions and enforces
    // @RequirePermissions(...).
    { provide: APP_GUARD, useClass: PermissionsGuard },
    // Audit successful mutations (Workflow -> API -> DB -> Audit).
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
