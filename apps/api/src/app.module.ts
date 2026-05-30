import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppConfigModule } from './config/config.module';
import { LoggerModule } from './logger/logger.module';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { AuditInterceptor } from './common/audit.interceptor';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    DbModule,
    HealthModule,
    AuthModule,
    UsersModule,
  ],
  providers: [
    // Zod DTOs are the contract: validate every request body/param/query.
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    // Global auth. ORDER MATTERS: authenticate first (populate req.user)...
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // ...then authorize by role.
    { provide: APP_GUARD, useClass: RolesGuard },
    // Audit successful mutations (Workflow -> API -> DB -> Audit).
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
