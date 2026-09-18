# Operations and release procedure

## Configuration

Copy `.env.example` and set every required value. Never commit `.env`. SESSION_SECRET must contain at least 32 random characters. Use a least-privilege database account, a separate migration account where appropriate, and a bucket-scoped S3 service identity rather than MinIO root credentials in production.

Production: NODE_ENV=production, HTTPS APP_ORIGIN, DEMO_DATE empty/unset, secure session secret, managed PostgreSQL, private S3 bucket, ClamAV or equivalent validated scanner, and SMTP for account recovery. CORS allows exactly APP_ORIGIN. Set TRUST_PROXY to the exact number of trusted reverse-proxy hops, never indiscriminately trust client forwarded headers. HTTPS termination and HSTS belong at the ingress; keep API and object-store administration private.

The sample Compose is a **local development** configuration. When using its `app` profile at http://localhost:8080, set APP_ORIGIN=http://localhost:8080 and NODE_ENV=development. Do not expose it directly as a production deployment. Choose immutable reviewed image digests for MinIO, mc, ClamAV, Mailpit, Node, Nginx and PostgreSQL before a release; the supplied moving tags are for local reproducibility of configuration, not an immutable production bill of materials.

## Build and deploy

```sh
npm ci
npm run db:generate
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev

docker compose --env-file .env -f infra/compose.yaml --profile app build
# Start dependencies, then run migrations before starting the API.
docker compose --env-file .env -f infra/compose.yaml up -d postgres minio bucket-init clamav mailpit
docker compose --env-file .env -f infra/compose.yaml --profile app run --rm api npm run db:migrate
docker compose --env-file .env -f infra/compose.yaml --profile app up -d api worker web
```

Provision the first administrator through `node dist/apps/api/src/admin.js` inside the API image, with ADMIN_* environment variables supplied securely. Never run the demo seed in production. The production Docker image contains compiled server code; the worker command is `node dist/apps/api/src/worker.js`. Web output is `apps/web/dist`; Nginx serves the SPA and proxies `/api` to the API.

No public deployment was performed in this task.

## Health, observability and shutdown

- `/api/health`: process liveness.
- `/api/ready`: database connectivity. External S3/scanner/SMTP configuration must be checked as a separate release gate; readiness does not certify those services.
- Pino emits structured JSON, request IDs, response statuses and durations; request bodies, cookies, authorization headers and query strings are not logged.
- Central error middleware is the error-monitoring integration point. Add a server-side Sentry/OpenTelemetry adapter with PII collection disabled; log a request ID, not client records.
- Alert on elevated 5xx/latency, login failures, database saturation, failed/stale Job rows, growing quarantine, scan failures and backup age.
- SIGTERM/SIGINT closes HTTP acceptance, drains connections, disconnects Prisma and the session pool. A 10-second guard ends stuck API shutdown. Workers finish the current bounded job, then disconnect.
- For multiple API replicas, move auth/API rate limits to the shared ingress or a shared store. The current in-process limiter is appropriate for one API instance.

## Reminders and documents

Run at least one worker. Claiming and retry state is durable in PostgreSQL; multiple workers use SKIP LOCKED. Retries use exponential delays and fail after five attempts. Administrator Settings shows failures and retry actions. Fixed demo time does not advance automatically; future reminders require advancing/removing DEMO_DATE for a live scheduling demonstration. Document scanning must not be bypassed to make demos appear successful.

MinIO bucket initialization explicitly sets anonymous access to none. S3 credentials stay on the server. Uploaded bytes are signature-checked, assigned an unguessable key and quarantined. ClamAV INSTREAM must be reachable privately; validate with a clean sample and EICAR test file in a nonproduction environment. Confirm rejected/quarantined downloads return 409 and cross-workspace requests return 404. Object storage is cleaned if metadata insertion fails; an operator should reconcile orphan objects after process-level failures.

Messaging defaults to manual/deep links. WhatsApp Business and transactional email delivery adapters/webhook signature validation are external integration work; unavailable automation must remain disabled. SMTP password recovery uses the configured transport. Test delivery, expiry, single-use reset and session revocation before release.

## Backup and restore

1. Back up PostgreSQL with managed snapshots/WAL archiving or `pg_dump --format=custom`. Encrypt backups, restrict access, define retention and verify backup completion.
2. Enable S3 object versioning and private replication/lifecycle policies as appropriate. Back up documents alongside database metadata at a consistent recovery point.
3. Store secrets separately in a secret manager; do not include plaintext credentials in backup logs.
4. Restore into an isolated workspace with outbound messaging disabled. Use `pg_restore` against a new database, restore the corresponding object versions, and verify metadata references, ownership, scan status, financial totals and representative downloads.
5. Rotate restored session secrets and clear restored sessions/reset tokens before allowing users in. Resume workers only after checking queued jobs against restored event state.
6. Perform and record periodic restore drills, including RPO/RTO measurements. No restore drill has been certified by this build.

## Migrations and rollback

SQL migrations are additive and versioned. Apply `prisma migrate deploy` once before rolling out compatible application instances. Back up first; inspect migration SQL and lock duration in staging. Do not use `migrate reset` on populated environments. Runtime-created legacy session tables are registered with CREATE TABLE IF NOT EXISTS in the second migration.

Tag application images and retain the prior known-good version. Prefer expand/migrate/contract changes so the prior app remains schema-compatible. Roll back the image first when compatible. For incompatible database changes, stop writes/workers and execute a reviewed forward-fix or restore the coordinated database/object-store recovery point. Never casually reverse migrations containing live financial history.

## Outstanding release gates

The local host has no Docker executable, so image builds/Compose startup were not exercised. S3/ClamAV upload-release/download, actual SMTP reset delivery, TLS ingress, production IAM, external provider callbacks, shared rate limiting for replicas, backup restoration and an independent security assessment must be completed before calling this production-ready. These are explicit external dependencies, not mocked successful integrations.
