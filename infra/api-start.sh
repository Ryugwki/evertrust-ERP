#!/bin/sh
# Render free-tier API startup.
#
# Render runs a service's Docker Command WITHOUT a shell (it splits the string on
# spaces into argv), so `cmd1 && cmd2` does NOT chain — `&&` is passed as a literal
# argument. We therefore keep the chain inside this script and invoke it with a
# clean two-token command:  sh /app/infra/api-start.sh
#
# Free tier also has no pre-deploy hook, so migrations + the bootstrap seed run
# here on every start. Both are idempotent: drizzle-kit migrate is a no-op when the
# DB is up to date; seed exits early if the org already exists.
set -e

echo "[api-start] running DB migrations..."
corepack pnpm --filter @evertrust/db db:migrate

echo "[api-start] seeding bootstrap data (idempotent)..."
corepack pnpm --filter @evertrust/db db:seed

echo "[api-start] launching API..."
exec corepack pnpm --filter @evertrust/db exec node --import tsx /app/apps/api/dist/main.js
