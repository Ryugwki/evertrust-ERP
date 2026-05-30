import { z } from 'zod';

// Boot-time environment contract. Validated once at startup so the process
// FAILS LOUD (crashes) on misconfiguration instead of erroring deep in a request.
export const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  // Required secrets — no defaults; missing values must crash the process.
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),

  JWT_EXPIRES_IN: z.string().default('1d'),

  // Comma-separated allowlist of browser origins for CORS. Empty = no CORS.
  CORS_ORIGINS: z.string().default(''),

  // Cookie flags. `secure` should be true behind TLS in production.
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export type Env = z.infer<typeof EnvSchema>;

// @nestjs/config `validate` hook. Throws (boot crash) when env is invalid.
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = EnvSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
