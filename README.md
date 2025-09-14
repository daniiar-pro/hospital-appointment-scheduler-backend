# Hospital Appointment Scheduler



## Table of Contents ##
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Quickstart](#quickstart)
- [Project Structure](#project-structure)
- [Environment](#environment)
- [Project Status](#project-status)
- [Authentication](./docs/02-AUTH.md#authentication)
    - [Sign Up](./docs/02-AUTH.md#sign-up)
    - [Login](./docs/02-AUTH.md#login)
    - [Profile](./docs/02-AUTH.md#profile)
    - [Refresh](./docs/02-AUTH.md#refresh)
    - [Logout](./docs/02-AUTH.md#logout)
- [Data Modelling](./docs/03-DB-DIAGRAM.md)

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



## Quickstart
```
# clone
git clone https://github.com/daniiar-pro/hospital-appointment-scheduler.git

# Install Dependencies
npm install

# dev
npm run dev

# type-check and build JS
npm run build

# run built server
npm start
```


## Project Structure
```
.
├─ src/
│  ├─ app.ts                       # Express app wiring (routes, middleware)
│  ├─ index.ts                     # Bootstraps server (PORT, listen)
│  ├─ libs/
│  │  └─ jwt/
│  │     └─ index.ts               # Custom HS256 JWT (sign/verify/decode)
│  ├─ middleware/
│  │  └─ authenticate.ts           # Access-token verify + role guard
│  ├─ modules/
│  │  ├─ auth/
│  │  │  ├─ routes.ts              # /auth/signup, /auth/login, /auth/refresh, /auth/logout
│  │  │  └─ password.ts            # scrypt hash/verify (Node crypto)
│  │  ├─ tokens/
│  │  │  └─ repo.file.ts           # refreshTokens.json (hash + rotation)
│  │  └─ users/
│  │     └─ repo.file.ts           # users.json (find/create)
│  └─ utils/
│     └─ filedb.ts                 # tiny file-based JSON store (atomic writes)
│  └─ config.ts                    # configuration
├─ data/
│  ├─ users.json
│  └─ refreshTokens.json
├─ docs/
│  └─ 02-AUTH.md                   # Detailed Task-2 notes 
│  └─ 03-DB-DIAGRAM.md             # Detailed Task-3 notes 
├─ .env                            # local only (ignored)
├─ .env.example                    # sample envs (JWT_SECRET, PORT,…)
├─ tsconfig.json
├─ package.json
├─ package-lock.json
├─ .gitignore
└─ README.md

```

## Environment

```
JWT_SECRET=change-me
PORT=3000
ACCESS_TTL_SECONDS=900
REFRESH_TTL_DAYS=30
```



## Project Status

- ✅ **Task 1 — Overview / Repo Setup**
- ✅ **Task 2 — Authentication (custom JWT from scratch)**  [Authentication](docs/02-AUTH.md)
- ✅ **Task 3 — DB Schema & Diagram**  [Data Modelling](docs/03-DB-DIAGRAM.md)
- ⏳ **Database Implementation** (to be added)
	
