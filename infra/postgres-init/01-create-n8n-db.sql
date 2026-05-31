-- Runs once on first Postgres init (empty data dir) via docker-entrypoint-initdb.d.
-- The main app uses the `evertrust` database (created by POSTGRES_DB); n8n needs
-- its OWN database on the same server. `CREATE DATABASE` cannot run inside the
-- transaction the entrypoint wraps a single statement in, but each statement in
-- an initdb .sql file is fine. Owner is the evertrust superuser created by the
-- image so n8n can create its schema.
CREATE DATABASE n8n OWNER evertrust;
