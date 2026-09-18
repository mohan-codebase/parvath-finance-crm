# Parvath FinServ CRM

A React/TypeScript/Tailwind workspace backed by an Express/TypeScript API and PostgreSQL/Prisma. The seven principal screens follow the supplied planner: Dashboard, Clients, Client Profile, Add New Client, Leads, Renewals and Follow-ups. Supporting screens cover products, communications, import review, notifications, settings and authentication.

**Local application:** http://localhost:5177 · **API:** http://localhost:4007/api/health

The current workspace has a synthetic demo database and a locally generated administrator. Its email and random password are in the ignored `.env` file (`ADMIN_EMAIL`, `ADMIN_PASSWORD`). No fixed password is shipped or committed. Change the password from Settings after signing in.

## Runtime and installation

- Node **24.11+ / 24.x** (verified with 24.19.0; `.nvmrc` supplied).
- PostgreSQL **17** (verified locally with 17.11).
- npm with workspaces; exact resolved dependencies are captured in `package-lock.json`.
- Docker Compose v2 for optional reproducible PostgreSQL, private MinIO, ClamAV and development SMTP infrastructure.

```sh
npm ci
cp .env.example .env
# Set DATABASE_URL, TEST_DATABASE_URL, APP_ORIGIN and a random SESSION_SECRET.
# For Docker infrastructure, also set distinct POSTGRES_PASSWORD,
# S3_ACCESS_KEY and S3_SECRET_KEY.
npm run db:generate
npm run db:migrate
```

Optional local infrastructure:

```sh
docker compose --env-file .env -f infra/compose.yaml up -d postgres minio bucket-init clamav mailpit
```

For this Compose database, use port **5433** in the host's DATABASE_URL. For host-run API/worker, use MinIO at `http://localhost:9000`; expose ClamAV on loopback or run the worker inside Compose. Mailpit SMTP is `smtp://localhost:1025`, inbox http://localhost:8025. Do not use Mailpit in production.

## Secure first administrator

Set `ADMIN_EMAIL`, `ADMIN_NAME`, and a **unique 12+ character** `ADMIN_PASSWORD` in your environment or ignored `.env`, then run:

```sh
npm run admin:create
```

This creates a new workspace and its administrator. It refuses to overwrite existing accounts. Remove the administrator password from deployment environment files after provisioning. Additional members and roles can be managed by the administrator in Settings. Existing users are never automatically linked across organizations.

## Demo and development

For synthetic data only, set `DEMO_DATE=2026-09-04T06:30:00.000Z` (4 September 2026, noon in India):

```sh
npm run db:seed
npm run dev
# Separate terminal for durable reminders / scanning:
npm run worker
```

The seed refuses production and skips an already populated workspace. It contains synthetic Indian contact names with `example.test` email addresses and invented phone/policy identifiers. Production starts empty and must have `DEMO_DATE` unset.

The server uses ports 5177/4007 to avoid other local projects. Set `APP_ORIGIN` to the actual browser origin. There is no automatic unauthenticated demo login.

## Verification

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:browser -- journeys
npm run demo:cleanup
npm run test:browser -- visuals
npm audit --omit=dev
```

`npm test` requires `TEST_DATABASE_URL` pointing to a **separate migrated database**. Tests create isolated organizations and remove only their own fixtures. Never use a production database.

See [verification results](docs/verification.md), [visual inventory](docs/visual-inventory.md), [architecture and permissions](docs/architecture.md), [API contracts](docs/api.md), and [deployment procedures](docs/operations.md). Reference extractions and browser screenshots are under `docs/reference` and `docs/verification`.

## External services and release status

This is a deployable local application, **not a claim of production readiness**. Private document storage and scanning require configured S3/MinIO and ClamAV. Uploads fail explicitly if storage is absent; unscanned files cannot be downloaded. SMTP is required for password-reset delivery. WhatsApp/email/call deep links record only that a conversation was opened; automated messaging and delivery verification are not configured.

Docker is not installed in the build environment, so Compose images and the full S3/ClamAV/SMTP deployment must be validated on a Docker host before release. TLS, infrastructure secrets, provider accounts, backup/restore drills and external security review remain operator responsibilities. No public deployment has been performed.
