# Evertrust ERP — Build Tracker

**Sources:** `docs/evertrust/` (canonical company spec) · `docs/COMBINE.md` (stack×domain reconciliation) · `docs/BUILD_PLAN.md` (architecture).
**Stack (kept per the Combine):** Next.js + NestJS + Drizzle + JWT + PostgreSQL 16 · multi-tenant · permission-RBAC · immutable audit · **Claude-only** · n8n **Cloud** (writes via ERP API; Docker = local dev only).
**Roadmap = the 52-row / 8-phase tender workflow** (`docs/evertrust/08-workflow-canonical.md`) — not M-numbers.
Convention: nothing is "done" until its verify gate passes; update `tasks/lessons.md` after any correction.

---

## Platform foundation — ✅ DONE & LIVE (2026-05-30)
Built, verified, committed (`93333f7` → `74385cd`). Running: backend in Docker, web on local dev.
- [x] Monorepo (pnpm + Turborepo): `apps/{api,web}`, `packages/{shared,db}`, `infra/`; CI workflow.
- [x] Auth: NestJS JWT + argon2; **L1–L5 roles + lanes** (OPERATIONS/MARKETING/HR); creds in `auth_credentials`.
- [x] Multi-tenancy: `organizations` + `organizationId` (SaaS-ready, single-tenant today); every query org-scoped.
- [x] **Permission RBAC** (19-perm catalog → L1–L5 matrix in `@evertrust/shared`); API-enforced + `useCan`/`<Can>` UI gating.
- [x] **Immutable audit log** on every mutation (org-stamped; actor/before/after).
- [x] Data model (~20 tables, Drizzle + pgvector): tenders (Vergabe-ID, 7-status), suppliers, customers, line_items, supplier_prices, pricing, approval_requests, compliance_checks, doc_packages, submission_receipts, amendments, assignments, audit_log, workflow_executions, ai_runs, embeddings, organizations, users, auth_credentials. Single clean baseline migration.
- [x] **Tender core** (≈ Phase 4 record): CRUD + the **7-status state machine** (guarded transitions), tenant-scoped, permission-gated, audited. Supplier/customer registries.
- [x] Web: landing page · login/logout (stale-session safe) · dashboard · tenders (list + **status board** + detail + create/edit/transition) · suppliers · customers · RBAC-gated nav.
- Follow-ups (non-blocking): `/auth/me` 401 on missing-user (auto-heal stale sessions) · production-minimal Docker images (runtime-tsx now) · `audit_log.entityId` nullable for entity-less events · CI green needs a GitHub remote.

---

## The 8-phase roadmap

### Phase 1 — Partner scouting (R01–R14) ❄ FROZEN
Kha's lane; out of automation scope. No write paths.

### Phase 2 — Tender search + intake (R15–R15c) — ⬜ not started
- [ ] **Argus** — portal search (TED API + DÖE; DTVP/Service-Bund; licensed feeds first, ToS-respecting scrape fallback). n8n **Cloud** → ERP API.
- [ ] Download package → stage **TYPE 1** docs (R15a). High-volume/complex detector (R15b). Per-client profile pre-filter (R15c).
- [ ] **Scribe** — parse GAEB **X81/X83** + PDF (OCR) → structured fields → tender record + line items.

### Phase 3 — Per-client shortlist + confirm/reject (R16–R19) — ⬜ not started
- [ ] **Sieve** — match tender vs active client profiles (niche/LV value/location/size/blacklist) → shortlist.
- [ ] Send to matched clients (queue-for-approval) → reject loops to next; all-reject → trash. State: pending→sent→awaiting→confirmed|rejected|timeout.
- [ ] Open Q: definition of "all clients reject → trash".

### Phase 4 — Record open + assign + upload (R20–R22) — ✅ DONE (2026-05-30)
- [x] Open ERP tender record.
- [x] **Assign L5 PIC** — manual: `POST /tenders/:id/assign` + assignee card (supersedes prior ACTIVE; L5 can't self-assign). Auto-assign algorithm deferred.
- [x] **TYPE 1 doc upload** — Multer disk storage + uploads volume; upload/list/download on the tender detail.
- [ ] Missing-docs detector (R20) — deferred.

### Phase 5 — Pricing (R23–R29) ★ HIGHEST VALUE — 🟡 5a DONE (2026-05-30)
- [x] **5a — LV line items** + **PriceObservation** evidence (7 sources; weights 90/80/70/60/50/45/40; REAL/MIXED/ESTIMATE; confidence cap 60) + **R/Y/G** + high-risk rule (≥35% unbacked OR top-5 unbacked) + **pricing workbench** UI. Finalize → `CUSTOMER_PRICING`. (API+web live, 77 tests.)
- [ ] **5b — Claude** price-assist for unbacked/red lines (AI suggests; humans decide). L5 refine → L3 sign-off.
- [ ] **5c — Hermes** supplier RFQ (Gmail/n8n). Track A pricing ∥ Track B docs from R24.

### Phase 6 — Client approval + deadline check (R30–R31) — ✅ DONE (2026-05-31)
- [x] **6a — Customer-approval gate** — `approvals` module (open request / record decision / list) + the HARD gate in `TendersService.transition`: `DOCUMENTS→SUBMITTED` is blocked (400) unless an `APPROVED` `CUSTOMER` approval exists. **Channel-agnostic** evidence (free-form `evidenceUrl` — link OR note). One shared rule `isSubmissionBlocked` (API enforces; web disables + explains the SUBMITTED affordance, can't drift). Decision gated by `approvals:decide` (L1–L3); opening a request by `tenders:write`. Approval card on the tender detail.
- [x] **6b — Deadline safety + escalation** — pure `computeDeadlineRisk` in `@evertrust/shared` (T-2→**L4**, T-1→**L3**, T-0/overdue→**L2**; reminder cadence T-5/T-3/T-1) + `GET /tenders/deadline-risk` (open at-risk worklist, most-urgent-first, tenant-scoped) — the SAME computation the dashboard renders **and** n8n Cloud polls. "Deadline at risk" dashboard card + per-tender header badge. Reminder/escalation **sending/routing is n8n's job** (ERP owns the deterministic computation only).
- Verify: API+web typecheck clean; +gate-predicate / approvals-service / approvals-permission / deadline-risk (pure + service) tests; **106 api tests green**. Not yet committed.

### Phase 7 — Documents + QC + submit (R32–R37) — ⬜ not started
- [ ] **TYPE 2** doc prep (master checklist); completeness/missing-form detection (`doc_packages`, `compliance_checks` exist).
- [ ] **L4 QC** (conditional: risky/complex/high-value/sensitive).
- [ ] Submit at **T-2** (portal stays human) → **R36–37 evidence logging** (proof + timestamp + file list) — *lowest-risk first automation*.

### Phase 8 — Result + follow-up (R38–R52) — ⏸ PARKED
KPIs, win/loss, contract, billing, supplier review. Manual for now.

---

## Growth Engine (AIM sequence) — outside the tender roadmap — ✅ DONE (2026-05-31)
The outbound sales arsenal as an ERP module (separate domain from tender-ops). New `/growth-engine` page: the **AIM** "Lock & Load" form (9 fields) → `POST /campaigns` (validate + persist + audit) → fires the **AIM n8n webhook** server-side (`N8N_AIM_WEBHOOK_URL`; blank = save-as-DRAFT, safe before it's set) → the arsenal (Lead Satellite → Ammo Forge → Reach Bazooka → Reply Glock → Sleeper Grenade) then runs autonomously in n8n off the campaign config.
- [x] `campaigns` table + `campaign_status` enum (migration `0001_common_giant_girl.sql` — **apply before use**: `db:migrate` / `docker compose`).
- [x] `campaigns:read` / `campaigns:write` RBAC (write = L1–L4; L5 read-only). `CampaignsModule` (service+controller+dto); deploy failures recorded (FAILED + `deployError`), never thrown — observable.
- [x] Web: Growth Engine page = AIM launch dialog + arsenal-pipeline visual + launched-campaign list (status badge + Drive-folder link). Nav entry (campaigns:read).
- [x] **Arsenal triggers** — manual "Run now" per stage (`POST /arsenal/:stage/run` → fires the stage's n8n webhook, records every hand-off in `arsenal_runs` as DISPATCHED/FAILED, never throws). PER_CAMPAIGN stages (Lead Satellite, Ammo Forge) run on a campaign; GLOBAL stages (Bazooka, Reply Glock, Sleeper) in an org-wide panel + a recent-runs list. Per-stage webhook URLs are config (`N8N_*_WEBHOOK_URL`, blank = disabled). Reuses `campaigns:write` (trigger) / `campaigns:read` (view).
- [x] **Bazooka daily schedule — editable in-app** — the send time is an ERP setting (`arsenal_settings`, edited in Growth Engine → Arsenal controls, no redeploy). A dependency-free per-org scheduler arms a timer that fires the Bazooka webhook daily (source SCHEDULED) and re-arms on edit; independent of n8n's own 8 AM schedule. (Replaces the old `ARSENAL_BAZOOKA_DAILY_AT` env var.)
- [x] **Env wiring done** — the ERP→n8n webhook URLs are set in `.env` (+ documented in `.env.example`) and passed through `infra/docker-compose.yml` to the API container. AIM / Lead Satellite / Ammo Forge use their real n8n webhook URLs (live); Bazooka / Reply Glock / Sleeper are pre-wired to `erp-bazooka-run` / `erp-reply-glock-run` / `erp-sleeper-run`.
- ⚠ **Prereqs:** the schedule-only workflows (Bazooka, Reply Glock, Sleeper) still need a **Webhook trigger added in n8n** (POST, the `erp-*-run` paths above) — the only step I can't safely auto-do (editing a live ~80-node workflow via `update_workflow` risks credential/setting loss; see [[n8n-edit-approach]]). Apply migrations `0001`–`0003` before use.
- [ ] **Follow-on:** n8n→ERP writeback / live per-stage status (needs the ERP deployed to a reachable URL + a status-callback endpoint). Direction ERP→n8n (trigger + daily schedule) works today.
- Verify: shared/db/api/web typecheck clean; +campaigns/arsenal service + permission + settings tests + scheduler-helper test; **134 api tests green**. Not yet committed.

## Cross-cutting (every phase)
- AI: **Claude only** (`@anthropic-ai/sdk`). Agent codenames: Argus/Scribe/Sieve/Hermes/Hydra/Eve/Nero/Aza/Cipher.
- n8n: **Cloud**, writes via ERP API; naming `[Lane] - [Function] - [TEST|PROD]`; ≤12 nodes; 8 promotion conditions; ERP-first.
- Dashboard frames **Trev's 5**: urgent / blocked / who-owns / deadline-at-risk / needs-decision.
- GDPR/EU · observability · "no written approval = no submission" · T-5/T-2 · TYPE 1/2 · GAEB X81/X83/X86.

## Review / changelog
- **2026-05-30** — Platform foundation done & live (M0 + M1 + Combine). Tender core on the canonical 7-status / L1–L5 / Vergabe-ID domain. Tracker reconciled to the 8-phase workflow.
- **2026-05-30** — **Phase 4 done & live** (`9512dc6`): tender assignment + TYPE 1 doc upload/download.
- **2026-05-30** — **Phase 5a done & live** (`245362d` API + `639c876` web): LV line items + PriceObservation engine (R/Y/G, confidence cap) + pricing workbench.
- **2026-05-30** — **Phase 6a done** (not yet committed): customer-approval gate — `approvals` module + hard `DOCUMENTS→SUBMITTED` block (no recorded `CUSTOMER` approval → no submit), channel-agnostic evidence, shared `isSubmissionBlocked`, approval card + gated transition affordance. Doc conflict resolved (canonical "process rule" vs tracker "enforced in code"): **hard gate on submission, any channel counts as the approval**.
- **2026-05-31** — **Phase 6b done → Phase 6 COMPLETE** (not yet committed): deterministic `computeDeadlineRisk` (T-2/T-1/T-0 → L4/L3/L2 + T-5/T-3/T-1 reminder cadence) + `GET /tenders/deadline-risk` worklist + "deadline at risk" dashboard card + per-tender header badge. Reminder/escalation *routing* delegated to n8n Cloud (ERP owns the computation only). 106 api tests green. **Next:** Phase 5b (Claude price-assist) / Phase 7 (docs + QC + submit).
- **2026-05-31** — **Growth Engine module** (not yet committed): ERP-native AIM sequence — `/growth-engine` page + `campaigns` table/module that fires the AIM n8n webhook server-side, so an **ERP→n8n outbound trigger now exists**. Mirrors Kha's growth-engine site; the arsenal stays autonomous in n8n. 115 api tests green. (n8n→ERP writeback still pending a deploy.)
- **2026-05-31** — **Arsenal triggers + Bazooka daily schedule** (not yet committed): generic `POST /arsenal/:stage/run` (per-stage webhook, records `arsenal_runs`) + "Run now" buttons (per-campaign + global panel) + a dependency-free ERP-owned daily Bazooka scheduler. Schedule-only n8n workflows still need a Webhook trigger added (user's task). 130 api tests green.
- **2026-05-31** — **Editable daily time + env wiring** (not yet committed): daily Bazooka send time moved env → in-app `arsenal_settings` (editable in the UI; scheduler re-arms on edit). ERP→n8n webhook URLs wired in `.env`/`.env.example`/compose (AIM/Lead Satellite/Ammo Forge live; Bazooka/Reply Glock/Sleeper await a Webhook node in n8n). Migration `0003`. **134 api tests green.**
- **2026-05-31** — **Daily Bazooka send timezone + Arsenal controls polish** (not yet committed): the daily send now carries an explicit IANA **timezone** (was opaque server-local). Curated DACH+UTC picker (default `Europe/Berlin`) in Growth Engine → Arsenal controls; the dependency-free scheduler computes the next occurrence in that zone, DST-correct via `Intl` (legacy null zone → server-local fallback, so existing rows/tests are untouched). Wired shared DTO (+`isValidTimeZone`, refine: a set time requires a zone) → `arsenal_settings.bazooka_timezone` (migration `0004_amusing_katie_power`) → service/controller/scheduler → web. Card given a tasteful polish (timezone select, On·time·zone badge, hover stage rows). **Apply migration `0004` before use.** **145 api tests green** (+ DST summer/winter scheduler cases).
