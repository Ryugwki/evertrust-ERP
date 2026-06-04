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

  // SameSite for the auth cookie. Use 'none' (with COOKIE_SECURE=true) when the
  // web and API live on DIFFERENT sites (e.g. *.vercel.app + *.onrender.com) so
  // the session cookie can cross origins. 'lax' is correct for same-site (a shared
  // root domain like app./api.evertrust-germany.de) and for local dev.
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  // Filesystem directory where uploaded tender documents are stored (Phase 4).
  // Created at boot if missing. In containers this is a mounted volume.
  UPLOAD_DIR: z.string().min(1).default('./uploads'),

  // Growth Engine: the AIM "deploy campaign" n8n webhook (the reference's
  // EVERTRUST_DEPLOY_WEBHOOK). Empty = skip the deploy step — the campaign still
  // persists as DRAFT — so the feature is safe to run before the webhook is set.
  N8N_AIM_WEBHOOK_URL: z.string().default(''),

  // Arsenal stage webhooks (the "Run now" triggers). Each blank = that stage's
  // trigger is disabled (the API rejects the run + the button hides). The
  // schedule-only n8n workflows (Bazooka, Reply Glock, Sleeper) need a Webhook
  // trigger added in n8n before their URLs resolve.
  N8N_LEAD_SATELLITE_WEBHOOK_URL: z.string().default(''),
  N8N_AMMO_FORGE_WEBHOOK_URL: z.string().default(''),
  N8N_REACH_BAZOOKA_WEBHOOK_URL: z.string().default(''),
  N8N_REPLY_GLOCK_WEBHOOK_URL: z.string().default(''),
  N8N_SLEEPER_GRENADE_WEBHOOK_URL: z.string().default(''),
  // (The daily Bazooka send time is now an ERP-editable setting in arsenal_settings,
  // not an env var — changeable in the UI without a redeploy.)

  // Phase 5b — Claude price-assist. Blank ANTHROPIC_API_KEY = the feature is
  // DISABLED (the price-assist endpoint returns { configured: false } instead of
  // erroring), so the API is safe to run before a key is set. ANTHROPIC_MODEL is
  // the model id used for suggestions — overridable without a code change.
  ANTHROPIC_API_KEY: z.string().default(''),
  ANTHROPIC_MODEL: z.string().default('claude-3-5-sonnet-latest'),

  // Phase 5c — Hermes supplier RFQ. The n8n webhook the ERP fires to email an RFQ
  // to suppliers. Blank = the RFQ trigger is disabled (the API rejects "send" with
  // a clear message), so the feature is safe to deploy before the webhook exists.
  N8N_HERMES_RFQ_WEBHOOK_URL: z.string().default(''),

  // n8n executions poller — real RUNNING→END sync for the Growth Engine sequence.
  // N8N_API_URL = the instance base (https://<host>); N8N_API_KEY = a read-only n8n
  // public API key. Blank EITHER = the feature is OFF and the strip falls back to
  // its dispatch-based status proxy. The ERP only ever READS executions.
  N8N_API_URL: z.string().default(''),
  N8N_API_KEY: z.string().default(''),

  // n8n→ERP run callback shared secret. An n8n stage workflow posts its autonomous
  // run outcome to POST /arsenal/runs/callback with this token in the
  // `x-arsenal-token` header. Blank = the callback endpoint is DISABLED (returns
  // 503), so the feature is safe to deploy before a token is minted. This is the
  // ONLY auth on that public (JWT-less) route — treat it like a password.
  ARSENAL_INGEST_TOKEN: z.string().default(''),

  // Sales-Agent push ingest. The workflow POSTs each completed analysis to
  // POST /sales/meetings/ingest with the ARSENAL_INGEST_TOKEN. This pins which
  // org those meetings land in (single-tenant deploy). Blank = resolve by the
  // prospect's lead, else the sole organization.
  SALES_INGEST_ORG_ID: z.string().default(''),

  // Key Account hot-leads webhooks. PROVISION creates a campaign's hot_leads sheet
  // (POST {folderId}); PIPELINE intakes Interested leads + graduates customers
  // (POST {folderId}). Blank = that ERP action is disabled. Hot-lead DATA is read
  // via the executions backfill (N8N_API_URL/KEY), not these.
  N8N_PROVISION_HOT_LEADS_WEBHOOK_URL: z.string().default(''),
  N8N_HOT_LEADS_PIPELINE_WEBHOOK_URL: z.string().default(''),
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
