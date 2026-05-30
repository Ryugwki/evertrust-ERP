import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { AppConfigService } from '../config/app-config.service';
import type { AuthUser, JwtPayload } from './auth.types';

// Pulls the JWT from the httpOnly `access_token` cookie first (browser flow),
// then falls back to the Authorization: Bearer header (API / n8n flow).
function fromCookieOrBearer(req: Request): string | null {
  const cookieToken = (
    req.cookies as Record<string, string> | undefined
  )?.access_token;
  if (cookieToken) return cookieToken;
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: AppConfigService) {
    super({
      jwtFromRequest: fromCookieOrBearer,
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  // Return value is attached to req.user. We trust the signed claims (sub, role,
  // org) rather than re-hitting the DB on every request.
  validate(payload: JwtPayload): AuthUser {
    return {
      id: payload.sub,
      role: payload.role,
      organizationId: payload.org,
    };
  }
}
