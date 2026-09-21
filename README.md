<div align="center">

# JanaSahaya

**Smart Civic Issue Reporting & Resolution Platform**

JanaSahaya is a full-stack civic issue reporting and resolution platform that connects citizens, municipal officers, and administrators through a transparent workflow from issue reporting to resolution and citizen verification.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socket.io&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

</div>

> **Live demo:** not deployed yet — run it locally with Docker (see [Quick start](#quick-start)).
> **API docs:** served by the backend at `/api/docs` (OpenAPI JSON at `/api/docs/openapi.json`).

## Screenshots

<p align="center">
  <img src="docs/screenshots/citizen-dashboard.png" alt="JanaSahaya citizen dashboard" width="80%" />
</p>

The repository currently ships one real screenshot. The remaining views below are the recommended set to capture for a complete visual tour:

| Screenshot | Path | Status |
| --- | --- | --- |
| Landing page | `docs/screenshots/landing.png` | to capture |
| Citizen dashboard | `docs/screenshots/citizen-dashboard.png` | included |
| Report issue | `docs/screenshots/report-issue.png` | to capture |
| Citizen map | `docs/screenshots/issue-map.png` | to capture |
| Admin dashboard | `docs/screenshots/admin-dashboard.png` | to capture |
| Audit logs | `docs/screenshots/audit-logs.png` | to capture |

## Features

**Citizen**
- Geotagged civic issue reporting (GPS, map pin, or manual address)
- Photo uploads with duplicate warnings before submission
- Voting, following, comments, and replies
- Status tracking and resolution verification
- Real-time notifications over Socket.IO

**Officer**
- Department-scoped issue queue
- Atomic issue claiming (no two officers can claim the same issue)
- Status workflow with resolution evidence
- SLA tracking and breach visibility

**Admin**
- Issue triage, assignment, and status overrides
- Officer, department, category, and SLA-rule management
- Escalations, moderation, and abuse/trust signals
- Audit log and analytics dashboards

## Engineering Highlights

- **Geospatial duplicate detection** using Haversine distance plus category and weighted text similarity into an explainable score.
- **Explainable priority scoring** that returns the score, level, and human-readable reasons.
- **SLA-based escalation** with breach and approaching-deadline tracking.
- **Role-based access control** for citizens, officers (department-scoped), and admins (last-admin protection).
- **Transaction-safe lifecycle transitions** — officer claims are atomic and status changes commit or roll back as a unit.
- **Rotating refresh tokens** stored in httpOnly cookies, with token families and reuse detection.
- **Secure image validation** — extension allow-list plus magic-byte verification, random filenames, and size caps.
- **Real-time updates** over Socket.IO for status changes and notifications.
- **Dockerized deployment** with a persistent uploads volume and a host Nginx TLS reverse proxy.
- **Audit history** for sensitive administrative actions.

## Architecture

```
React + Vite
     │
     ▼
REST API + Socket.IO
     │
     ▼
Node.js + Express
     │
     ▼
Service / Repository Layer
     │
     ▼
MySQL
```

In production the stack runs behind **Nginx**, orchestrated with **Docker Compose**, with uploads stored on a **persistent volume**.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS |
| Maps | Leaflet, React Leaflet |
| Backend | Node.js, Express |
| Database | MySQL |
| Realtime | Socket.IO |
| Auth | JWT + rotating refresh tokens |
| Charts | Recharts |
| Deployment | Docker, Nginx |
| Testing | Vitest (frontend) + `node --test` (backend) |

## Issue Lifecycle

```
Submitted
   ↓
Under Review
   ↓
Assigned
   ↓
In Progress
   ↓
Resolved
   ↓
Closed / Reopened
```

Transitions are validated by the backend: each status change is checked against an allowed-transition map and the actor's role, so invalid or out-of-order moves are rejected.

## Quick start

### 1. Docker (recommended)

```sh
cp .env.example .env        # replace every CHANGE_ME value
docker compose up -d --build
```

The frontend binds to `127.0.0.1:8080` for a host Nginx reverse proxy; the API and MySQL stay internal to the Compose network. On startup the backend creates the schema, applies migrations, and seeds reference/demo data.

For production, HTTPS, backups, and update instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

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

## Environment variables

Copy the provided examples and replace every placeholder:

- Root (Docker Compose): [`.env.example`](.env.example)
- Backend (local dev): [`backend/.env.example`](backend/.env.example)

Key settings:

- **MySQL** — `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- **JWT** — `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (independent random values)
- **Origin** — `CLIENT_ORIGIN`, the exact browser-visible origin used by CORS and Socket.IO
- **Uploads** — `UPLOAD_DIR`, `MAX_UPLOAD_MB`
- **Demo accounts** — `ENABLE_DEMO_ACCOUNTS`, `DEMO_CITIZEN_EMAIL`, `DEMO_ADMIN_EMAIL`, `DEMO_PASSWORD`

Never commit real secrets.

## Demo access

When `ENABLE_DEMO_ACCOUNTS=true`, public demo buttons appear on the login page. The seeded demo accounts are:

- **Citizen demo** — `citizen@janasahaya.demo`
- **Admin demo** — `admin@janasahaya.demo`

The demo admin is intentionally restricted: it can explore and manage demo-citizen issues but cannot mutate users, roles, departments, categories, or system configuration. Demo credentials are configurable via `.env`; no production credentials are documented or committed.

## API documentation

Interactive OpenAPI documentation is served at `/api/docs`, with the raw spec at `/api/docs/openapi.json`.

## Testing

```sh
# backend
cd backend
npm test                    # unit tests (node --test)
npm run test:smoke          # live smoke suite (needs a running backend)

# frontend
cd frontend
npm test                    # Vitest
npm run build               # production build
```

Backend unit tests cover the Haversine distance, duplicate scoring, text similarity, and priority/status rules. The smoke suite exercises the full role-based lifecycle against a running server.

## Deployment

The intended production setup is a single Linux host running Docker Compose behind a host Nginx TLS reverse proxy:

- **Frontend** — built container served by Nginx
- **Backend** — Node.js + Express container
- **Database** — MySQL 8 with a named volume
- **Uploads** — persistent named volume shared with the backend

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full runbook.

## Project structure

```
.
├── backend/
│   ├── src/
│   │   ├── config/         env config + production validation
│   │   ├── controllers/    request-layer handlers
│   │   ├── services/       business logic (lifecycle, priority, duplicates, SLA)
│   │   ├── repositories/   SQL access layer
│   │   ├── db/             schema.sql, migrations/, setup.js
│   │   ├── middleware/     auth, RBAC, upload security, rate limiting
│   │   ├── routes/         API + Swagger mount
│   │   └── sockets/        Socket.IO realtime hub
│   ├── docs/openapi.yaml   OpenAPI spec (served at /api/docs)
│   └── tests/              unit tests + live smoke suite
├── frontend/
│   └── src/
│       ├── pages/          citizen / officer / admin dashboards
│       ├── components/     common UI, maps, and issue components
│       ├── services/       axios API layer + token-refresh interceptor
│       └── context/        auth and Socket.IO providers
├── docs/screenshots/
├── deploy/                 Nginx site example
├── docker-compose.yml
├── .env.example
└── README.md
```

## Security

- JWT access tokens with rotating refresh tokens in **httpOnly** cookies
- Refresh-token families with reuse detection
- Role-based access control with department scoping for officers
- Rate limiting on auth, registration, password, reporting, commenting, and interactions
- Secure image validation (allow-lists + magic-byte verification)
- Helmet with a restrictive Content-Security-Policy
- Restricted CORS to the configured client origin
- Sensitive log redaction (authorization headers and cookies)
- Audit log for administrative actions
