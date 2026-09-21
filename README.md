# CrowdSourced Civic Issues

A full-stack civic issue reporting and resolution platform. Citizens report street-level problems (potholes, garbage, street lighting…), the administration triages and assigns them to department officers, and officers resolve them with photo evidence that citizens verify — all tracked against SLA deadlines.

## Stack

| Layer     | Tech |
|-----------|------|
| Frontend  | React 18 (Vite), Tailwind CSS, Leaflet maps, recharts, Socket.IO client |
| Backend   | Node.js 22 (ESM), Express, Socket.IO, Pino logging |
| Database  | MySQL 8 (mysql2 pool) |
| Security  | Helmet, express-rate-limit, multer magic-byte verification, refresh-token families, argon-style bcrypt hashing, role-based access control |

## Project layout

```
backend/
  src/
    config/        env config + production validation
    controllers/   request-layer handlers (auth, issues, admin, analytics, ...)
    services/      business logic (incl. transactions & concurrency for issue lifecycle)
    repositories/  SQL access layer
    db/            schema.sql, migrations/, setup.js (schema + migrations + seed)
    middleware/    auth, RBAC, upload security, rate limiters, error handling
    validators/    express-validator chains
    routes/        API + Swagger mount
    sockets/       Socket.IO realtime hub
  tests/           node --test unit tests + live smoke suite
  docs/openapi.yaml  → served at /api/docs
frontend/
  src/
    services/      axios API layer + auto token-refresh interceptor
    contexts/      auth
    pages/         citizen / officer / admin dashboards, issue detail, map, explorer
    components/    common UI + issues
```

## Quick start

### 1. Docker (recommended)

```sh
cp .env.example .env        # then set real secrets
docker compose up --build
```

Services: frontend on [http://localhost:8080](http://localhost:8080), API on :4000, Swagger UI on `/api/docs`, MySQL on :3307 (host :3306 already used by a local server). The backend bootstraps the schema, migrations and seed data automatically.

### 2. Local development

```sh
# backend
cd backend
cp .env.example .env        # point DB_* at your MySQL and set secrets
npm ci
npm run db:setup            # creates schema + migrates + seeds
npm run dev                 # http://localhost:4000

# frontend (separate terminal)
cd frontend
npm ci
npm run dev                 # http://localhost:5173 (proxies /api, /uploads, /socket.io)
```

## Seed credentials

| Role    | Email             | Password     |
|---------|-------------------|--------------|
| Admin   | admin@civic.gov   | Admin@123456 |
| Officer | officer@civic.gov | Officer@123456 |

## Tests & verification

```sh
cd backend
npm test                  # unit tests (node --test)
npm run test:smoke        # 17 live-server checks (needs running backend)

cd frontend
npm run build
```

## API docs

Interactive OpenAPI documentation is served at `/api/docs` and the raw spec at `/api/docs/openapi.json`.

Highlights of the hardened surface:

- **Auth**: access tokens on the client + rotating refresh tokens in httpOnly cookies, refresh-token **families** with reuse-detection (replayed tokens revoke the whole session).
- **Rate limiting**: dedicated limiters for auth / register / password / report / comment / interaction; configurable via env.
- **Uploads**: extension allow-list + **magic-byte verification** (spoofed images and scripts are rejected), random filenames, size cap.
- **Concurrency**: officer claims are atomic (single winner, 409 on collision), no issue-stealing, resolution and status changes run in DB transactions, citizen re-verification can only produce one `REOPENED` transition.
- **RBAC**: citizens / officers / admins with department scoping for officers and last-admin protection.
- **Observability**: request-id correlation ids, pino structured logs, `/ready` health endpoint, audit log for admin actions.

## Reproducibility notes

- The production config guard refuses to boot with the default dev JWT secrets (`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` must be overridden, see `backend/src/config/env.js`).
- Migrations live in `backend/src/db/migrations/` and are applied idempotently via the `schema_migrations` table.