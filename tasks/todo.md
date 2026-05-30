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

### Phase 6 — Client approval + deadline check (R30–R31) — ⬜ not started
- [ ] **Customer-approval gate** — written approval required; **no approval → no submission** (enforced in code). `approval_requests` exists.
- [ ] **T-2** deadline safety check + escalation (L4→L3→L2). Reminder cadence.

### Phase 7 — Documents + QC + submit (R32–R37) — ⬜ not started
- [ ] **TYPE 2** doc prep (master checklist); completeness/missing-form detection (`doc_packages`, `compliance_checks` exist).
- [ ] **L4 QC** (conditional: risky/complex/high-value/sensitive).
- [ ] Submit at **T-2** (portal stays human) → **R36–37 evidence logging** (proof + timestamp + file list) — *lowest-risk first automation*.

### Phase 8 — Result + follow-up (R38–R52) — ⏸ PARKED
KPIs, win/loss, contract, billing, supplier review. Manual for now.

---

## Cross-cutting (every phase)
- AI: **Claude only** (`@anthropic-ai/sdk`). Agent codenames: Argus/Scribe/Sieve/Hermes/Hydra/Eve/Nero/Aza/Cipher.
- n8n: **Cloud**, writes via ERP API; naming `[Lane] - [Function] - [TEST|PROD]`; ≤12 nodes; 8 promotion conditions; ERP-first.
- Dashboard frames **Trev's 5**: urgent / blocked / who-owns / deadline-at-risk / needs-decision.
- GDPR/EU · observability · "no written approval = no submission" · T-5/T-2 · TYPE 1/2 · GAEB X81/X83/X86.

## Review / changelog
- **2026-05-30** — Platform foundation done & live (M0 + M1 + Combine). Tender core on the canonical 7-status / L1–L5 / Vergabe-ID domain. Tracker reconciled to the 8-phase workflow.
- **2026-05-30** — **Phase 4 done & live** (`9512dc6`): tender assignment + TYPE 1 doc upload/download.
- **2026-05-30** — **Phase 5a done & live** (`245362d` API + `639c876` web): LV line items + PriceObservation engine (R/Y/G, confidence cap) + pricing workbench. **Next:** 5b (Claude assist) / Phase 6 (approval gate).
