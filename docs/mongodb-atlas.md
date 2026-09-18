# MongoDB Atlas setup and cutover

## Atlas connection

1. Choose a separate development database, for example `parvath_crm_dev`. Do not point initial setup at an unrelated company database: the CRM owns its named collections and their validators/indexes.
2. In Atlas, provision a database user restricted to that database. The runtime needs read/write access. Use a separate migration identity with collection creation, `collMod` and index privileges (for example database-scoped `readWrite` plus `dbAdmin`) only when applying schema setup.
3. Allow the API host's public IP, private endpoint or approved network path through Atlas Network Access. Do not use a public `0.0.0.0/0` rule as deployment configuration.
4. Copy the Node.js driver connection URI into the **server-only** ignored `.env` as `MONGODB_URI`; URL-encode special characters in the password. Set `MONGODB_DB` explicitly. The database name in this variable takes precedence over a database path in the URI.
5. Run `npm run db:migrate`, then provision an administrator or migrate an existing database. Restart API and worker after changing connection settings.
6. Verify `/api/ready`, sign-in, record creation and a transactional workflow against the designated Atlas development database. A successful local replica-set test does not establish Atlas connectivity.

```dotenv
MONGODB_URI=mongodb+srv://USER:URL_ENCODED_PASSWORD@YOUR_CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=parvath_crm_dev
TEST_MONGODB_URI=mongodb+srv://TEST_USER:URL_ENCODED_PASSWORD@YOUR_CLUSTER.mongodb.net/?retryWrites=true&w=majority
TEST_MONGODB_DB=parvath_crm_test
```

Keep the test identity separate where possible and restrict it to the test database. Do not enable the synthetic seed or test suite against production. Production rejects DEMO_DATE and a non-HTTPS APP_ORIGIN.

Atlas manages replica-set topology; no `replSetInitiate` command is needed there. The CRM requires transactions and checks for replica-set/sharded deployment support on startup and schema setup. It does not support a standalone local mongod.

## Local and container alternatives

`npm run db:local` starts/reuses only the dedicated `parvathLocal` replica set at `127.0.0.1:27027`; other MongoDB services are not modified. It requires `mongod` on PATH, supports macOS without `--fork`, and stores its files in `.local-mongodb/` (ignored by Git/Docker).

Docker alternative:

```sh
docker compose --env-file .env -f infra/compose.yaml --profile local-db up -d mongodb mongo-init
```

When the API runs on the host, use `mongodb://127.0.0.1:27027/?replicaSet=parvathLocal&directConnection=true`. A containerized API uses `mongodb://mongodb:27017/?replicaSet=parvathLocal`. Set MONGODB_URI accordingly in `.env`. Do not simultaneously use the native and Docker servers on port 27027. The `local-db` profile is optional: the API/worker services can connect directly to Atlas without running a database container.

The loopback local replica set is unauthenticated and intended only for development. Production should use Atlas authentication/TLS/network restrictions and reviewed database privileges. MongoDB startup, user management and backups are not performed implicitly by the CRM.

## Persistence choices

- Official `mongodb` driver; no Prisma client, PostgreSQL connection, or Redis at runtime.
- Existing UUID strings remain both `id` and MongoDB `_id`, preserving URLs and cross-record references. Collection names correspond to the documented entities.
- Server-side `$lookup` pipelines implement related-record filters and projections. Sorting/pagination run in MongoDB. A small repository module supports the CRM's existing service query vocabulary; it is not a general-purpose ORM and rejects unknown fields/operators.
- Multi-record workflows use `ClientSession.withTransaction`, snapshot reads, majority writes and the driver's bounded retry handling. Operations within a transaction are sequential. Version predicates detect stale edits; unique indexes protect idempotent results. Contact mutations increment a workspace guard in the transaction so concurrent duplicate checks cannot both silently insert a contact.
- Native collection validators enforce field types and required values. Unique partial indexes apply to non-null opportunity IDs, allowing multiple unrelated policies while preventing duplicate conversion products. MongoDB does not enforce foreign keys; repository reference checks and service-level organization/client checks enforce links. Direct out-of-band database writes must follow the same rules.
- Monetary fields are BSON signed 64-bit integers, deserialized as JavaScript BigInt. Aggregated money uses Decimal128 intermediates, converted back to BigInt, avoiding floating-point totals. APIs continue to return decimal strings.
- Date-only business values are UTC-midnight BSON dates; they are interpreted as calendar dates, never converted into local instants for comparisons. Timestamped actions remain real UTC instants and are displayed in the workspace timezone.
- `connect-mongo` stores sessions as BSON objects with an expiry index. Revocation queries use the indexed `session.userId`. Expired sessions are rejected even before the TTL sweep physically deletes them. Existing SQL sessions are deliberately not copied; sign in again after cutover.
- MongoDB Job documents use atomic `findOneAndUpdate` claims, server-time lease timestamps, a fencing token, retry scheduling and unique notification IDs. Stale workers cannot release a document or overwrite another worker's job result. No external queue is required for the current workload.

`db:migrate` creates/updates validators and indexes and records schema version `001-mongodb`. It never drops collections or indexes. Future incompatible field changes require a reviewed backfill and a new versioned migration; do not merely make an existing field required on a populated collection.

## One-time PostgreSQL cutover

The current local synthetic dataset was copied and reconciled. The source remains unchanged. Password hashes, UUIDs, history and amounts are preserved. The importer is deliberately bounded to **10,000 business records**, refuses production mode and refuses any nonempty target business collection. It does not overwrite or merge existing Atlas records.

For another staged cutover:

1. Back up PostgreSQL and private files. Stop application writes and workers; keep the source available read-only. Snapshot/read consistency does not replace a write freeze.
2. Create a fresh target database and configure MONGODB_URI/MONGODB_DB. Set LEGACY_POSTGRES_URL for a read-only source identity.
3. Run `npm run db:import-postgres`. It uses a repeatable-read, read-only SQL snapshot and a MongoDB transaction. A unique cutover marker prevents concurrent duplicate imports.
4. Run `npm run db:verify-cutover -- --report` **before** accepting target writes. This compares every source field and collection count without printing sensitive values. Only a passing result writes `docs/verification/mongodb-cutover.json`.
5. Sign in again and verify workflows, document access and financial totals. Switch the API and worker connection settings together. Remove the legacy connection from runtime configuration and revoke the temporary migration identity.
6. Retain the source backup for the agreed retention period. Do not delete the source during validation.

PostgreSQL DATE values are parsed explicitly as UTC-midnight calendar dates. During the first local cutover, the default pg date parser exposed a timezone shift; the importer was corrected, the staged date-only fields were reconciled, and a subsequent read-only verification reported zero differences. The optional `--repair-date-only` verification flag is restricted to staging and a marked initial cutover; use it only before target writes and after reviewing mismatches. It does not change the source or other fields.

If a failure occurs before target writes are accepted, switch back to the old application commit and its untouched SQL database. Once MongoDB has accepted new writes, a blind switch back would lose changes: freeze writes and reconcile the delta or restore a reviewed recovery point. No automatic reverse synchronization is implemented.

## Verification status

Local MongoDB 8.2.7 replica-set tests passed. Atlas credentials/network access have not been provided, so an actual company Atlas connection has **not** been tested. Docker-based CI and Compose configuration are supplied but have not been executed on this host, which lacks Docker. See [verification report](verification.md) for the exact exercised checks.
