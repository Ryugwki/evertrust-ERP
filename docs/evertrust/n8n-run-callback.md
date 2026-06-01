# n8n → ERP run callback

How an n8n stage workflow reports an **autonomous run** back to the ERP so it shows
up in the Growth Engine **Live activity** feed (per campaign).

Without this, the ERP only logs runs *it* dispatched (the "Run now" buttons + the
daily scheduler). The actual stages (Lead Satellite, Ammo Forge, …) run on their
own inside n8n (Drive poll / cron) and were invisible to the ERP. This callback is
the missing **n8n → ERP writeback**.

> The sequence strip's live "RUNNING" dots come from the read-only executions
> poller. This callback is different: it records the **final outcome** of a run as
> a permanent row in the activity feed.

---

## Endpoint

```
POST  {ERP_API_BASE}/arsenal/runs/callback
Header:  x-arsenal-token: <ARSENAL_INGEST_TOKEN>
Header:  Content-Type: application/json
```

- **Auth** is the shared secret `ARSENAL_INGEST_TOKEN` (set in `infra/.env`) sent in
  the `x-arsenal-token` header. This is the **only** auth on the route — there is no
  JWT (n8n has no ERP session). Treat the token like a password.
- **Responses:** `202` `{ "ok": true, "id": "<runId>" }` on success ·
  `401` invalid/missing token · `503` token not configured on the server ·
  `404` the named campaign / Drive folder is unknown · `400` bad body.

### Body

| field          | required | notes |
|----------------|----------|-------|
| `stage`        | yes      | One of `LEAD_SATELLITE`, `AMMO_FORGE`, `REACH_BAZOOKA`, `REPLY_GLOCK`, `SLEEPER_GRENADE`. Case-insensitive (normalised to upper-case). |
| `status`       | yes      | `SUCCESS` or `ERROR` — the **final** outcome of the run. Case-insensitive. |
| `campaignId`   | no*      | The ERP campaign UUID, if the workflow knows it. |
| `driveFolderId`| no*      | The Google Drive folder id of the campaign — what n8n knows natively. The ERP resolves the campaign (and its org) from this. |
| `detail`       | no       | Short free-text (≤500 chars), e.g. `"12 leads scraped"` or an error message. |

\* **Per-campaign stages** (Lead Satellite, Ammo Forge) should send **either**
`campaignId` **or** `driveFolderId` so the run attaches to that campaign.
**Global stages** (Bazooka, Glock, Sleeper) send **neither** — they're recorded as
cross-campaign global runs.

Resolution order: `campaignId` first, else `driveFolderId`, else global.

---

## Networking

- **n8n Cloud** (`evertrustgmbh.app.n8n.cloud`) cannot reach `localhost` — the ERP
  API must be **publicly reachable** (a tunnel such as `cloudflared` / `ngrok`, or a
  deployed host). Use that public origin as `{ERP_API_BASE}`.
- **Self-hosted n8n** on the same Docker network can reach the API directly at
  `http://api:3001`.

---

## The node to add (one per stage workflow)

At the **end of the workflow's happy path**, add an **HTTP Request** node:

- **Method:** `POST`
- **URL:** `{ERP_API_BASE}/arsenal/runs/callback`
- **Authentication:** *Generic → Header Auth* credential with
  Name `x-arsenal-token`, Value = the token (store as an n8n credential / env var —
  do **not** paste it inline in the node).
- **Send Body:** on, **JSON**:

```json
{
  "stage": "AMMO_FORGE",
  "status": "SUCCESS",
  "driveFolderId": "={{ $json.driveFolderId }}",
  "detail": "={{ $json.summary }}"
}
```

Set `stage` to the literal for that workflow. Map `driveFolderId` from whatever node
holds the campaign folder (n8n already reads config from it). Drop `driveFolderId`
entirely for a global stage.

### Error branch

Add a second HTTP Request node on the workflow's **error output** (or an *Error
Trigger* workflow) with the same config but:

```json
{
  "stage": "AMMO_FORGE",
  "status": "ERROR",
  "driveFolderId": "={{ $json.driveFolderId }}",
  "detail": "={{ $json.error?.message || 'run failed' }}"
}
```

> Per the Arsenal error philosophy: report failures too. An `ERROR` callback is what
> turns the campaign's row red in the feed and tells the operator something broke.

---

## Quick test (from a machine that can reach the API)

```bash
TOK=$(grep -E '^ARSENAL_INGEST_TOKEN=' infra/.env | sed -E 's/^ARSENAL_INGEST_TOKEN=//')
curl -s -w '\n%{http_code}\n' -X POST http://localhost:3001/arsenal/runs/callback \
  -H 'Content-Type: application/json' -H "x-arsenal-token: $TOK" \
  -d '{"stage":"ammo_forge","status":"success","driveFolderId":"<folderId>","detail":"manual test"}'
# -> {"ok":true,"id":"..."}  202
```

The run appears immediately under that campaign in **Growth Engine → Live activity**
(the feed polls every 15 s).
