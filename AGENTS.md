# AGENTS.md

## Cursor Cloud specific instructions

Hero-Pet is a single Next.js 15 app (pet shop management, UI/code in Portuguese) backed by
PostgreSQL (required) and Redis (optional, used by the WhatsApp bot endpoints). There is no
separate deployable service in this repo; the `bot/` directory and `scripts/` referenced by some
npm scripts are gitignored / not present, so ignore `bot:*` and `seed:demo` commands.

Standard commands live in `package.json` and `README.md` — read those first. Notes below are the
non-obvious gotchas discovered while setting up the cloud environment.

### Services (Docker)

- The dev/test workflow uses Docker (Postgres + Redis via `infra/compose.yaml`). Docker Engine is
  pre-installed in the VM snapshot but the daemon is NOT managed by systemd. Start it once per VM
  session before running services, e.g. in a background tmux session: `sudo dockerd`
  (the `ubuntu` user is in the `docker` group, so `docker`/`npm run services:up` work without sudo
  once the daemon is up). It uses the `fuse-overlayfs` storage driver (configured in
  `/etc/docker/daemon.json`).
- `npm run dev` runs `services:up` (compose) + `wait-for-postgres` + `next dev` on port 3000.
  Dev Postgres is on host port **5433**, Redis on 6379.

### Env files (gitignored — present in the snapshot, recreate if missing)

- `.env.development` — used by `npm run dev` and `npm run migration:up`. Mirror `.env.example`
  (localhost:5433, db `hero_pet`, plus an `AUTH_SECRET` >= 32 chars and `MIGRATIONS_AUTO_APPLY=1`).
- `.env.test` — copy of `.env.test.sample` (separate test DB on port **5434**, db `hero_pet_test`).
- Do NOT `source .env.test` into your interactive shell: it exports `POSTGRES_*`/`DATABASE_URL`
  that then override `--envPath`, making `npm run migration:up` silently target the test DB instead
  of dev. Run env-scoped commands in a subshell or a fresh shell.

### Migrations gotcha (important)

- The runtime auto-apply (`MIGRATIONS_AUTO_APPLY=1`) is unreliable here — it can fail with
  "Connection terminated", leaving the schema as only `pgmigrations` and the app returning
  `Internal error` / `relation "users" does not exist`. If that happens, apply migrations
  explicitly with `npm run migration:up` (dev) and reload.
- `POST /api/v1/migrations` is admin-only in dev and returns **401** when hit anonymously — use the
  `migration:up` script instead of the endpoint for local schema setup.

### First login / hello-world

- A migration seeds an initial admin: `admin@hero-pet.local` / `admin123` (with
  `must_change_password=true`, so the first login forces a password change at `/alterar-senha`).
  `/setup` only creates an admin when the `users` table is empty.
- Core flow works end to end: log in → change password → create entities at `/entities`.

### Lint / Test / Build

- `npm run test:unit` (Vitest) — passes; fast unit/component tests.
- `npm run test:ci` (Jest API/integration) — starts an in-process `next dev` server. Many suites
  currently FAIL because that server compiles with `process.env.NODE_ENV` inlined as `development`
  (Next dev behavior), so the `isTest` auth bypass in `app/api/v1/migrations/route.ts` never
  triggers and the per-suite `POST /api/v1/migrations` returns 401. This is a pre-existing code
  issue, not an environment problem. Use a dedicated test DB first: `npm run testdb:up`.
  Note: Jest also picks up the Vitest files under `tests/unit/**` and fails them ("Vitest cannot be
  imported in a CommonJS module") — run those via `npm run test:unit`, not Jest.
- `npm run lint:eslint:check` / `npm run lint:prettier:check` — currently report pre-existing
  failures (eslint errors in `tests/**`, prettier formatting across many files). Do not mass-fix
  unless asked.
- `npm run build` — succeeds (Next lints only `app/`/`components/`, not `tests/`).
