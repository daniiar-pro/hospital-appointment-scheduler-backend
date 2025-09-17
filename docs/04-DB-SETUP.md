# Database Setup & Migrations (PostgreSQL)

> This document delivers the **Task-4** requirements: executable SQL schema, code to create/connect/migrate the database, and clear run instructions.  
> **Note:** The API still uses file-based stores for `users` and `refreshTokens` from earlier tasks. Postgres is fully provisioned here; the API repositories will be switched to SQL in the next task.

> **Note:** When running with Docker, Postgres listens on localhost:5433 (mapped from container 5432), but when running locally without Docker it usually listens on localhost:5432—set DATABASE_URL accordingly.
- Running with Docker .env.DATABASE_URL=postgres://postgres:postgres@localhost:5433/hospital_app (port: 5433)
- Running with Postgres (locally) .env.DATABASE_URL=postgres://postgres:postgres@localhost:5432/hospital_app (port: 5432)

---

## Contents
- [Scope](#scope)
- [Deliverables (mapping to the assignment)](#deliverables-mapping-to-the-assignment)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [How to Run Docker](#how-to-run-docker)
- [How to Run Local Postgres alternative](#how-to-run-local-postgres-alternative)
---

## Scope

- Database: **PostgreSQL 17**
- Approach: All schema in **SQL files**, executed by small **TypeScript** scripts using `pg`.
- Goal: From a clean machine, reviewer can **spin up Postgres**, **create the app DB**, and **run the schema** to completion in one command.

---

## Deliverables (mapping to the assignment)

- **SQL Script File(s):**  
  `src/database/migrations/00_extensions.sql` → `05_seed.sql`  
  Contains **CREATE TABLE**, **ALTER TABLE**, **CREATE INDEX**, constraints, and seed data.  
  *(All SQL is idempotent; safe to re-run.)*

- **Execution Code:**  
  - `src/database/create-db.ts` —  **creates the app database** if missing.  
  - `src/database/migrate/migration.ts` — connects to app DB and **executes SQL files** in order within a transaction.

- **Technical Notes / Robustness:**  
  - Designed for a **clean instance** (Dockerized Postgres) and can be re-run without breaking.  
  - Proper primary keys, foreign keys, checks, enums, unique constraints, and indexes per the ERD.  
  - Handles common errors (database already exists; migration failure triggers **ROLLBACK**).

---

## Prerequisites

- **Node.js**: v22+  
- **npm**: latest  
- **Docker**: Desktop or CLI (only if using the Docker path)

---

## Environment Variables

Copy `.env.example` → `.env`. Defaults are **Docker-friendly**:

```env
NODE_ENV=development
PORT=3000

# Docker compose maps host 5433 -> container 5432
DATABASE_URL=postgres://postgres:postgres@localhost:5433/hospital_app

# Auth (used by the API)
JWT_SECRET=super-secret-change-me
ACCESS_TTL_SECONDS=900
REFRESH_TTL_DAYS=30
CI=false
```

## How to Run (Docker)

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

### Reset DB (Docker):
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


## How to Run Local Postgres  alternative
If you already have Postgres running on you machine:
1.	Set DATABASE_URL in .env to your local credentials, e.g.
```
DATABASE_URL=postgres://postgres:password1234@localhost:5432/hospital_app
```
2. Create DB and migrate (it'll create a hospital_app db if not exists and create tables from /migrations/.sql files):
```
npm run db:create
npm run db:migrate
```

3. Start API:
``` 
npm run dev
```
