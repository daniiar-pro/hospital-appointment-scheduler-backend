# Hospital Appointment Scheduler



## Table of Contents ##
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Project Status](#project-status)
- [Authentication](./docs/02-AUTH.md#authentication)
    - [Sign Up](./docs/02-AUTH.md#sign-up)
    - [Login](./docs/02-AUTH.md#login)
    - [Profile](./docs/02-AUTH.md#profile)
    - [Refresh](./docs/02-AUTH.md#refresh)
    - [Logout](./docs/02-AUTH.md#logout)
- [Data Modelling](./docs/03-DB-DIAGRAM.md)
- [Database Setup & Migrations](./docs/04-DB-SETUP.md)


## Overview
The Hospital Appointment Scheduler that enables patients to book appointments with doctors by specialization (e.g., cardiology, surgery). Doctors define working hours which the system turns into bookable slots; patients search and reserve the nearest available time. Scope will grow step‑by‑step with each lesson.

Core roles & flow (high level):

Doctor: sets/adjusts weekly availability → system generates discrete appointment slots; can cancel or modify future availability.

Patient: searches by specialization (or mapped symptoms), views free slots with durations, books/cancels/reschedules.

MVP highlights:

Auth: with roles (doctor, patient).

Data: SQL or NoSQL DB.

API: Express REST endpoints for auth, availability templates, slots, and bookings.

Reminders: simple "24‑hour before" reminder (implementation details added later).



## Tech Stack
	•	Runtime: Node.js + Express (TypeScript)
	•	Auth: Custom JWT (HS256) implemented with Node’s crypto (sign, verify, decode)
	•	Passwords: crypto.scrypt
	•	Tokens: Access (short-lived) + Refresh (opaque, hashed, rotated)
	•	Storage (temporary): local JSON files (swap to Postgres later)



## Installation
```
# Clone
git clone https://github.com/daniiar-pro/hospital-appointment-scheduler-backend

# Install Dependencies
npm install
```


## Environment Variables

Copy `.env.example` → `.env`. Defaults are Docker-friendly.

```env
NODE_ENV=development
PORT=3000

# When using Docker Postgres, host port is 5433 (mapped to container 5432)
DATABASE_URL=postgres://postgres:postgres@localhost:5433/hospital_app

# Auth
JWT_SECRET=super-secret-change-me
ACCESS_TTL_SECONDS=900
REFRESH_TTL_DAYS=30
CI=false
```

```md
> **Storage status (important)**
>
> - The **API still uses file-based JSON stores** for users and refresh tokens (from earlier tasks).
> - **PostgreSQL is fully provisioned** by Task-4 (Docker + SQL migrations) but endpoints are **not** migrated yet.
> - The next task will switch the repositories to SQL. See: [Task-4: Database Setup & Migrations].
```

### Run It With Docker (recommended)

1. Install deps
```
npm install
```
2. Start Postgres and apply schema
```
npm run db:up
```

This will:
- Start the Postgres container
- Wait for it to be ready
- Create the hospital_app database (if missing, no double db creation allowed)
- Run all SQL migrations and seed default specializations


3. Delete containers and volumes (if you want to start everything fresh):
```
docker-compose down -v
```
And again 
```
npm run db:up
``` 
will start fresh instance

4. Start the API
```
npm run dev
```
Visit: http//localhost:3000/health ---> ok!


### Run It WITHOUT Docker (local Postgres - alternative)
If you already have Postgres running on you machine:
1.	Set DATABASE_URL in .env to your local credentials, e.g.
```
DATABASE_URL=postgres://postgres:1234@localhost:5432/hospital_app
```
2. Create DB and migrate (it'll create a hospital_app db if not exists and create tables from /migrations/.sql files):
```
npm run db:create
npm run db:migrate
```

3. Start API:
``` npm run dev```


## Project Structure
```.
├─ src/
│  ├─ app.ts                       # Express app wiring (routes, middleware); createApp(db)
│  ├─ index.ts                     # Bootstraps server (createDatabase → createApp → listen)
│  ├─ libs/
│  │  └─ jwt/
│  │     └─ index.ts               # Custom HS256 JWT (sign/verify/decode)
│  ├─ middleware/
│  │  └─ authenticate.ts           # Access-token verify (+ optional role guard)
│  ├─ modules/
│  │  ├─ auth/
│  │  │  ├─ routes.ts              # /auth/signup, /auth/login, /auth/refresh, /auth/logout
│  │  │  └─ password.ts            # scrypt hash/verify (Node crypto)
│  │  ├─ tokens/
│  │  │  └─ repo.file.ts           # refreshTokens.json (hash + rotation) — temporary until SQL repos
│  │  └─ users/
│  │     └─ repo.file.ts           # users.json (find/create) — temporary until SQL repos
│  └─ config.ts                    # Unified config (port, DATABASE_URL, JWT, etc.)
│
├─ database/
│  ├─ index.ts                     # createDatabase(): pg Pool wrapper (+ withTransaction)
│  ├─ create-db.ts                 # CREATE DATABASE "hospital_app" if missing
│  ├─ migrate/
│  │  └─ migration.ts              # runs SQL files in order inside a transaction
│  └─ migrations/                  # executable SQL (idempotent)
│     ├─ 00_extensions.sql         # pgcrypto, btree_gist, citext
│     ├─ 01_types.sql              # ENUMs: user_role, appointment_status
│     ├─ 02_tables.sql             # users, specializations, doctor_specializations, ...
│     ├─ 03_constraints.sql        # CHECKs, UNIQUEs, business rules
│     ├─ 04_indexes.sql            # indexes for common queries
│     └─ 05_seed.sql               # seed specializations (ON CONFLICT DO NOTHING)
│
├─ docs/
│  ├─ 02-AUTH.md                   # Detailed Task-2 notes
│  └─ 03-DB-DIAGRAM.md             # Detailed Task-3 notes
│  └─ 04-DB-SETUP.md               # Detailed Task-4 notes
│
├─ data/                           # file stores (for early tasks; will be replaced by SQL)
│  ├─ users.json
│  └─ refreshTokens.json
│
├─ .github/
│  └─ workflows/
│     └─ ci.yml                    # CI: spins up Postgres, runs create-db + migrate (and tests later)
│
├─ docker-compose.yml              # Postgres 17 service (e.g., 5433:5432 mapping, volume, healthcheck)
├─ Dockerfile                      # (optional) Node dev container; if used, set DB host to `db`
│
├─ .env                            # local only (ignored) — DATABASE_URL, JWT_SECRET, etc.
├─ .env.example                    # sample envs (Docker-friendly defaults)
├─ .gitignore
├─ package.json
├─ package-lock.json
└─ tsconfig.json
```





## Project Status

- ✅ **Task 1 — Overview / Repo Setup**
- ✅ **Task 2 — Authentication (custom JWT from scratch)**  [Authentication](docs/02-AUTH.md)
- ✅ **Task 3 — DB Schema & Diagram**  [Data Modelling](docs/03-DB-DIAGRAM.md)
- ✅ **Task 4 — Database Setup & Migrations (PostgresSQL)**  [Database Setup & Migrations (PostgresSQL)](docs/04-DB-SETUP.md)
- ⏳ **Next Task (probably)  — Switch API Repos to Postgres** (next)
	
