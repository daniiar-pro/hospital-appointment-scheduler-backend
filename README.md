# Hospital Appointment Scheduler

It covers :
- **Task-5 (Docker one-command startup)**
- **Task-6 (tests 50%+)**
- **Task-7 (CI pipeline), plus API usage.**

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [What’s Implemented](#whats-implemented)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment](#environment)
- [Quick Start Docker](#quick-start-docker)
- [Local Development (no Docker)](#local-development-no-docker)
- [Database & Migrations](#database--migrations)
- [Testing & Coverage](#testing--coverage)
- [Linting & Formatting](#linting--formatting)
- [CI Pipeline](#ci-pipeline)
- [Email Reminders (24h before)](#email-reminders-24h-before)
- [Endpoints](./docs/09-ENDPOINTS.md)
  - [Auth](./docs/02-AUTH.md#authentication)
  - [Admin](./docs/05-ADMIN.md)
  - [Doctor](./docs/06-DOCTOR.md)
  - [Patient](./docs/07-PATIENT.md)
  - [Specializations](./docs/08-SPECIALIZATIONS.md)
- [requests.http & Smoke Scripts](#requestshttp--smoke-scripts)
- [Troubleshooting](#troubleshooting)


---

## Overview

Hospital Appointment Scheduler is a **REST API** where:
- **Admins** manage users and specializations.
- **Doctors** set availability, exceptions, and generate time slots.
- **Patients** search free slots by specialization and book/cancel appointments.
- A **background reminders service** can send reminders ~24h before appointments.

There is **no web UI**; you interact via HTTP (curl/Postman/VS Code REST Client).

---

## Tech Stack

- **Runtime:** Node.js 22 + TypeScript + Express
- **DB:** PostgreSQL 17
- **Auth:** Custom JWT (HS256) + refresh tokens (opaque, hashed, rotated)
- **Migrations:** SQL files executed via small TS runner
- **Docker:** compose services for db, api, and reminders
- **Tests:** Jest + Supertest (80%+ overall coverage)
- **Lint/Format:** ESLint + Prettier
- **CI:** GitHub Actions (lint + tests on push/PR to `main`)

---

## What’s Implemented

- ✅ Task-4 DB schema & migrations (Postgres) – **done earlier**
- ✅ **Task-5** Docker: one command starts **DB + API** (and Reminders service)
- ✅ **Task-6** Unit & integration tests with **>80%** coverage and scripts to run & view coverage
- ✅ **Task-7** CI pipeline (lint & test on push/PR to `main`)
- ✅ End-to-end flows: admin, doctor, patient
- ✅ Background email reminders (console mode by default)

---

## Project Structure
```
.
├─ src/
│  ├─ app.ts                       # Express app wiring
│  ├─ index.ts                     # Server bootstrap
│  ├─ config.ts                    # Configuration (env parsing)
│  ├─ controllers/
│  │  ├─ auth/ auth.ts             # /auth/signup, /auth/login, /auth/refresh, /auth/logout, /auth/profile
│  │  ├─ admin/ admin.ts           # /admin/* (users, specializations)
│  │  ├─ doctor/ doctor.ts         # /doctors/me/* (profile, specs, weekly, exceptions, regenerate slots)
│  │  └─ patient/ patient.ts       # /patients/me/* (search, appointments)
│  ├─ database/
│  │  ├─ index.ts                  # createDatabase (pg Pool wrapper)
│  │  ├─ create-db.ts              # creates app DB if missing
│  │  ├─ drop-db.ts                # drops app DB (local dev helper)
│  │  ├─ seed-admin.ts             # seeds initial admin (from env)
│  │  ├─ migrate/ migrate.ts       # executes SQLs in /migrations
│  │  ├─ migrations/               # 00_extensions.sql … 07_doct.sql
│  │  └─ types.ts                  # DB row types
│  ├─ entities/                    # Zod schemas & DTOs
│  ├─ libs/ jwt/                   # sign/verify HS256, password hashing
│  ├─ middleware/                  # authenticate, authorizeRole
│  ├─ repositories/                # DB queries (users, tokens, slots, etc.)
│  ├─ services/                    # business logic (auth, doctor, appointments, etc.)
│  ├─ scheduler/
│  │  └─ run-reminders-24h.ts      # reminders job (24h before)
│  ├─ dev/
│  │  └─ warp-latest-appointment.ts# dev helper to move an appointment ~24h
│  ├─ smoke.ts                     # local smoke script
│  └─ requests.http                # VS Code REST Client scenarios (optional)
│
├─ docs/                           # extra docs (optional)
├─ dist/                           # compiled JS (Docker image build output)
├─ Dockerfile
├─ docker-compose.yml
├─ .github/workflows/ci.yml        # CI: lint + tests + coverage artifact
├─ .env.example
├─ package.json
├─ tsconfig.json
└─ README.md (this file)
```
---

## Prerequisites

- Node.js **v22**
- Docker Desktop (or Docker CLI + Compose)
- (Optional) VS Code + REST Client extension

---

## Environment

Copy `.env.example` → `.env` for local runs (Docker uses envs from `docker-compose.yml`):

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://postgres:Password123@localhost:5432/hospital_app
JWT_SECRET=super-secret-change-me
ACCESS_TTL_SECONDS=900
REFRESH_TTL_DAYS=30
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=ChangeIt1234!
CI=false
```

Note: 
-  In Docker, the API uses DATABASE_URL=postgres://postgres:<password>@db:5432/hospital_app and exposes 3000.
-  Postgres is mapped to host 5433 (container 5432).

⸻

## Quick Start Docker

This is the Task-5 one-command startup.

Clone the repository
```
git clone https://github.com/daniiar-pro/hospital-appointment-scheduler-backend.git
```

### Build images, start db+api+reminders, run migrations & seed admin automatically


```
npm run docker:up
```
Health Check
```
curl -s http://localhost:3000/health
```

CHECK ENDPOINTS (E2E tests (smoke tests) it'll check every endpoint automatically):
``` 
npm run smoke:docker
```

  - API will be on http://localhost:3000
  - DB on host localhost:5433 (container port 5432)
  - Default seeded admin: admin@gmail.com / ChangeIt1234!

Logs:

### Follow API logs
```
npm run docker:logs
```

Stop & remove containers/volumes:

```
npm run docker:down
```

⸻

# Local Development (no Docker)

### install deps
```
npm install
```


### set DATABASE_URL in .env to your local Postgres

```
npm run db:create
npm run db:migrate
npm run db:seed:admin
```


### start dev server with tsx watcher

```
npm run dev
```

Health check:
```
curl http://localhost:3000/health
```

⸻

## Database & Migrations
  - SQL migrations are in src/database/migrations/00_*.sql … 07_doct.sql
  - Runners:
            
            1.npm run db:create – creates the app DB if missing
            2.npm run db:migrate – applies SQL files in order (idempotent)
            3.npm run db:seed:admin – seeds ADMIN_EMAIL/ADMIN_PASSWORD
            4.npm run db:drop – local dev only (drops DB)
            5.Docker image copies compiled migrations into dist/database/migrations so they run on container start.

⸻

## Testing & Coverage

Run all tests:
```
npm test
```

Run with coverage (prints a text summary at the end):
```
npm run coverage
```

Open HTML coverage report (macOS):
```
npm run coverage:open
```

Status: Overall coverage is 80%+ (controllers/services/repos have broad coverage).
Unit tests use Jest and Supertest; no DB is required for tests (repositories are tested with fakes/mocks).

⸻

## Linting & Formatting

### Lint (non-blocking warnings allowed)
```
npm run lint
```

### Auto-fix what can be fixed
```
npm run lint:fix
```

### Format with Prettier
```
npm run format
```

### or check only
```
npm run format:check
```

⸻

## CI Pipeline
  -	File: .github/workflows/ci.yml
  -	Triggers on push/PR to main
  -	Steps:

                1.npm ci
                2.Lint (npm run lint)
                3.Tests (npm test)
                4.Coverage (npm run coverage)
                5.Uploads coverage artifact on GitHub (skipped when running locally with act)

The CI uses a dummy DATABASE_URL (tests don’t talk to a real DB).

⸻

## Email Reminders (24h before)
  -	Background service (reminders) runs in console mode in Docker and prints emails instead of sending real ones.
  -	It checks for appointments starting in ~24h within a sliding window.
  -	In Docker, it starts automatically. Locally you can run:

### DEV DEMO: warp the latest appointment near 24h and run reminders
```
npm run demo:reminder:docker
```
This:
  1.	Moves the most recent appointment ~24h ahead (dev helper),
  2.	Runs the reminder job for a 5-minute window,
  3.	Prints a console “email”.

⸻

## Endpoints Checking

# requests.http & Smoke Scripts
  -	VS Code REST Client: open src/requests.http and click “Send Request” on each block.
It walks through the admin → doctor → patient flows step-by-step.
  -	Smoke: local

  - npm run smoke


  -	Smoke: docker (executes inside running container)


⸻

## Troubleshooting
  -	Port 5433 already in use
  -	Stop local Postgres or change the host port in docker-compose.yml ("5433:5432").
  -	Cannot connect to DB (local runs)
  -	Verify .env → DATABASE_URL points to correct host/port and credentials.
  -	Docker “module not found”
  -	Ensure npm run docker:up was used (it builds TS → JS first).
  -	Unauthorized (401)
  -	Login with /auth/login, copy accessToken, include:

         Authorization: Bearer <token>


  -	REST Client warnings
  -	Requests are independent; send them in order or ignore warnings.


