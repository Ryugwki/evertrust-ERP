# Evertrust ERP — Build TODO

Plan source: `docs/BUILD_PLAN.md`. Decisions locked: TypeScript full-stack · Next.js (App Router) frontend · ERP core first · self-hosted (Docker/VPS).
Convention: check items as completed; every milestone ends with a verification gate; nothing is "done" until verified.

## Plan check (before building)
- [ ] Confirm plan + resolve open decisions (`BUILD_PLAN.md` §12): OCR approach, DeepSeek EU hosting, GAEB licensing, ibau feed, team/timeline
- [ ] Confirm the 5 architecture corrections are accepted (`BUILD_PLAN.md` §2)

## M0 — Foundations — ✅ DONE 2026-05-30 (stack verified running)
- [x] Monorepo: Turborepo + pnpm workspaces (`apps/{api,web}`, `packages/{shared,db}`, `infra/`); pnpm via corepack proxy
- [x] Docker Compose: postgres+pgvector, redis, migrate(one-shot), api, web, n8n main+worker (queue mode), traefik — all healthy
- [x] CI pipeline: `.github/workflows/ci.yml` (pnpm + lint/typecheck/test/build) — green-on-remote pending a GitHub remote
- [x] Auth skeleton: **NestJS JWT + Passport + argon2** (API is the auth authority; chosen over Auth.js/Lucia), RBAC roles, creds in `auth_credentials`
- [x] **Verify:** `docker compose up` all healthy ✓ · seeded user logs in ✓ · audited mutation writes immutable `audit_log` row ✓ · cross-workspace typecheck/test/lint green ✓
- Follow-ups (non-blocking): seed idempotency (onConflictDoNothing); production-minimal images (compile workspace deps vs runtime-tsx); `audit_log.entityId` nullable for entity-less events; login 201→200; migrate off `next lint` before Next 16

## M1 — ERP core ★ first build (~2–3 wk)
- [ ] **Drizzle schema + migrations — verified data model (build target below).**
  Conventions: UUID PKs · `timestamptz` everywhere · `createdAt/updatedAt` on all tables · **`numeric` for all money + a `currency` column (never float)** · pg enums + Zod unions for every `status/role/type/source/kind/regime` · FK + index on every `*Id` · `unique(source, externalId)` on Tender · unique `n8nExecutionId` on WorkflowExecution · **`AuditLog` append-only** (no update/delete) · pgvector HNSW index on `Embedding.vector`.

  ```
  User(id, role[PIC|PRICING|MANAGEMENT|ADMIN], name, email, active, createdAt)
  Customer(id, name, contact, niches, createdAt)
  Supplier(id, name, niches, capabilities, fitScore, contact, createdAt)
  Tender(id, externalId, source, title, buyer, customerId?, regime[VOB_A|VgV|UVgO]?, niche?,
         status[DETECTED|QUALIFIED|OPEN|PRICING|APPROVAL|SUBMITTED|WON|LOST],
         estimatedValue?, currency, isAboveThreshold, questionsDeadlineAt?, submissionDeadlineAt,
         location, createdAt, updatedAt)                       unique(source, externalId)
  Document(id, tenderId, type[TYPE1|TYPE2], kind, storageUrl, mimeType?,
           ocrStatus[PENDING|DONE|FAILED], ocrText?, parsedRef?, sourceParentDocId?, uploadedBy?, createdAt)
  Amendment(id, tenderId, detectedAt, diff, affectsDeadline)
  Assignment(id, tenderId, picId, workloadScore, reason, assignedAt, status)
  LineItem(id, tenderId, sourceDocId?, parentId?, position, description, longText?, qty, unit,
           spec, brand, std, bidEp?, bidGp?)                   -- deterministic
  SupplierPrice(id, lineItemId, supplierId, price, currency,
                source[QUOTE|ERP|OLD_TENDER|EXCEL|CATALOG|EMAIL],
                confidence, marginEstimate?, rygFlag[RED|YELLOW|GREEN], matchedAt)
  Pricing(id, tenderId, status[DRAFT|REVIEW|FINAL], subtotal, margin, finalPrice, currency,
          decidedBy?, decidedAt?, createdAt)
  ApprovalRequest(id, tenderId, type[PRICING|CUSTOMER|QC], status[PENDING|APPROVED|REJECTED],
                  evidenceUrl?, requestedAt, requestedBy?, decidedBy?, decidedAt?)
  ComplianceCheck(id, tenderId, regime, s123Pass, s124Flags[], eignungComplete, missingForms[],
                  reviewedBy?, checkedAt)
  DocPackage(id, tenderId, checklist, missing[], complete, generatedAt)
  SubmissionReceipt(id, tenderId, submittedBy, submittedAt, proofUrl)
  -- cross-cutting --
  AuditLog(id, entity, entityId, action, actorType[USER|SYSTEM|N8N|DEEPSEEK|CLAUDE],
           actorId?, before, after, correlationId?, at)        -- append-only
  WorkflowExecution(id, n8nExecutionId, workflowName, source, tenderId?, status, retries,
                    startedAt, finishedAt?, durationMs?, error?, at)
  AiRun(id, tenderId?, taskType, model, tokensIn, tokensOut, eurCost, confidence, escalated, at)
  Embedding(id, refType, refId, model, dim, content?, vector(N), createdAt)   -- N = embedding model dim, set at M5
  ```
  ⚠️ Open: confirm `buyer` (public contracting authority) vs `Customer` (client who gives written approval). `Tender.customerId` kept **nullable** until confirmed — model works either way.
- [ ] `KpiSnapshot` — schema deferred to M7 (not built in M1)
- [ ] Tender CRUD + status state machine (detected→…→won/lost)
- [ ] Supplier & customer registries
- [ ] RBAC roles (PIC/Pricing/Management/Admin)
- [ ] Immutable audit log on every state change
- [ ] Dashboard: tender list + status board + detail view (Next.js + shadcn/ui)
- [ ] **Verify:** create→assign→advance a tender by hand; all changes in audit log; RBAC blocks unauthorized; state-machine integration tests pass

## M2 — Ingestion & parsing (~2–3 wk)
- [ ] Document upload + storage; TYPE1/TYPE2 classification
- [ ] OCR service (Azure DI EU or self-hosted DeepSeek-OCR) behind a clean interface
- [ ] GAEB service (Dangl .NET container) → unified JSON
- [ ] Scribe extraction (DeepSeek strict-mode → Zod schema) → line_item rows
- [ ] X83 → X84 model + mandatory-position-priced validation
- [ ] **Verify:** real X83 + scanned PDF → correct line items; X84 round-trip; accuracy spot-checked vs ground truth

## M3 — Intake automation / Phase 2 (~2 wk)
- [ ] Argus n8n hourly schedule: TED API + DÖE feeds (+ ibau if licensed); scraping fallback (ToS/robots-respecting)
- [ ] Dedupe + amendment/deadline-change detection
- [ ] Sieve deterministic bid/skip rules (niche, blacklist, location, budget) in API
- [ ] **Verify:** scheduled run ingests live tenders, dedupes, applies rules; bid/skip matches rules test suite

## M4 — Matching & assignment / Phases 3–4 (~2 wk)
- [ ] Tender↔customer fit scoring + ranking
- [ ] Outreach draft generation (human-approved before any send)
- [ ] Auto-assign PIC (workload/niche/performance/deadline)
- [ ] **Verify:** ranking correct on known case; assignment respects workload caps; no outreach without human approval

## M5 — Pricing engine / Phase 5 ★ highest value (~3–4 wk)
- [ ] Supplier price matching (history/ERP/old tenders/Excel/catalogs)
- [ ] AI output: closest match, last price, confidence, margin estimate
- [ ] Red/Yellow/Green flagging (abnormal pricing/units/margins/unknown suppliers)
- [ ] Claude review of red/risky items
- [ ] Pricing workbench UI — humans set final price/margin/supplier
- [ ] **Verify:** price math deterministic + unit-tested; R/Y/G fires correctly; humans retain final-price control; diff vs a historically priced tender

## M6 — Approval + docs/QC/submit / Phases 6–7 (~3 wk)
- [ ] Customer-approval gate (n8n Wait + ERP UI); **no written approval → no submission, enforced in code**
- [ ] Reminder cadence T-5/T-3/T-1
- [ ] TYPE2 assembly + completeness/missing-form detection (per-tender required-forms manifest)
- [ ] Claude compliance review: §123 hard gate, §124 flags, Eignung completeness; regime detection (VOB/A vs VgV/UVgO) with runtime thresholds
- [ ] Submission package + receipt archiving (portal submit stays human)
- [ ] **Verify:** submission impossible without recorded approval; catches seeded missing Formblatt-124 + §123 trigger; package validated vs manifest

## M7 — Analytics / Phase 8 (~2 wk)
- [ ] KPIs: win/loss, supplier scoring, profitability, cost-per-tender
- [ ] AI cost / 70-30 split dashboard (from ai_run)
- [ ] Claude trend + loss-pattern analysis
- [ ] **Verify:** KPIs reconcile vs raw records; cost dashboard matches provider invoices within tolerance

## M8 — Partner scouting / Phase 1 (~2 wk, later)
- [ ] Supplier scraping + CRM enrichment + niche classification + capability summaries
- [ ] Claude strategic partner/risk evaluation
- [ ] **Verify:** enrichment spot-checked; no unsolicited automated outreach

## Cross-cutting (every milestone)
- [ ] Security/GDPR: EU-only inference, least privilege, TIA for any non-EU processor
- [ ] Observability: OpenTelemetry traces incl. ai_run cost/confidence
- [ ] AI eval harness for extraction/matching/compliance tasks
- [ ] Update `tasks/lessons.md` after any correction

## Review

**M0 — Foundations (2026-05-30):** Monorepo (pnpm+Turborepo): `@evertrust/shared` (Zod DTOs), `@evertrust/db` (Drizzle — 19 tables incl. `auth_credentials`, pgvector/HNSW), `apps/api` (NestJS: JWT auth, RBAC, Zod env, pino, audit interceptor), `apps/web` (Next.js 15 + shadcn + TanStack Query: login + protected dashboard). Full Docker stack verified up & healthy; seeded login + audited mutation proven via curl + psql; cross-workspace typecheck/test/lint green. CI written (needs a remote to run). Built via delegated subagents, each self-verified. See M0 follow-ups above.
_(next: M1 — ERP core)_
