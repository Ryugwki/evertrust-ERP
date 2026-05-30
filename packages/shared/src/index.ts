// @evertrust/shared — single source of truth for DTOs/types shared by api + web.
// Every API contract lives here as a Zod schema so client and server cannot drift.
import { z } from 'zod';

export const HealthDto = z.object({
  status: z.literal('ok'),
  service: z.string(),
  at: z.string(),
  // false when the DB `select 1` probe fails; the endpoint still returns 200 so
  // it can be used as a container healthcheck that does not flap on DB blips.
  db: z.boolean(),
});
export type HealthDto = z.infer<typeof HealthDto>;

// User role mirrors the `user_role` pgEnum in @evertrust/db. Kept as a literal
// union here so @evertrust/shared has no dependency on the DB package.
export const UserRole = z.enum(['PIC', 'PRICING', 'MANAGEMENT', 'ADMIN']);
export type UserRole = z.infer<typeof UserRole>;

// ---- Auth contracts (single source of truth for api <-> web) ----

export const LoginDto = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof LoginDto>;

// Public shape of a user returned to clients. Never includes the password hash.
export const MeDto = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: UserRole,
});
export type MeDto = z.infer<typeof MeDto>;

export const LoginResponseDto = z.object({
  accessToken: z.string(),
  user: MeDto,
});
export type LoginResponseDto = z.infer<typeof LoginResponseDto>;

export const UpdateMyNameDto = z.object({
  name: z.string().min(1).max(200),
});
export type UpdateMyNameDto = z.infer<typeof UpdateMyNameDto>;
