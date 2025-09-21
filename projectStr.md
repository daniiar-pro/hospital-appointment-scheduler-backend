```
.
├─ src/
│  ├─ index.ts                      # process bootstrap (reads config, creates DB, creates app, listen)
│  ├─ app.ts                        # Express wiring (routes, middleware) – accepts `db` instance
│  │
│  ├─ config/
│  │  └─ env.ts                     # unified config (PORT, DATABASE_URL, JWT, etc) via zod
│  │
│  ├─ database/
│  │  ├─ index.ts                   # createDatabase(): pg Pool wrapper (+withTransaction)
│  │  ├─ create-db.ts               # connects to admin DB; CREATE DATABASE if missing
│  │  ├─ migrate/
│  │  │  └─ migrate.ts              # runs SQL files in order (with optional ledger/checksums)
│  │  └─ migrations/
│  │     ├─ 00_extensions.sql
│  │     ├─ 01_types.sql
│  │     ├─ 02_tables.sql
│  │     ├─ 03_constraints.sql
│  │     ├─ 04_indexes.sql
│  │     └─ 05_seed.sql
│  │
│  ├─ entities/                     # Pure domain types/schemas (Zod) – NO I/O here
│  │  ├─ user.ts                    # z.userSchema, Role enum, helpers (parseUser)
│  │  ├─ specialization.ts
│  │  ├─ doctorSpecialization.ts
│  │  ├─ weeklyAvailability.ts      # weekday, start_time, end_time, duration, timezone
│  │  ├─ slotException.ts
│  │  ├─ availabilitySlot.ts
│  │  ├─ appointment.ts
│  │  └─ token.ts                   # refresh token record schema
│  │
│  ├─ repositories/                 # Pure DB access (SQL only; no HTTP/Express)
│  │  ├─ users.repo.ts
│  │  ├─ specializations.repo.ts
│  │  ├─ doctorSpecializations.repo.ts
│  │  ├─ weeklyAvailability.repo.ts
│  │  ├─ slotExceptions.repo.ts
│  │  ├─ availabilitySlots.repo.ts
│  │  ├─ appointments.repo.ts
│  │  └─ refreshTokens.repo.ts
│  │
│  ├─ services/                     # Business logic (compose repositories, invariants, transactions)
│  │  ├─ auth.service.ts            # signup/login/refresh/logout; password hash; token rotation
│  │  ├─ users.service.ts           # profile, role upgrade (admin-only), token_version bump
│  │  ├─ availability.service.ts    # CRUD weekly templates & exceptions + validation
│  │  ├─ slotting.service.ts        # generate/regen availability_slots (rolling horizon)
│  │  ├─ appointments.service.ts    # book/cancel/reschedule (uses withTransaction)
│  │  ├─ notifications.service.ts   # orchestrates reminders; calls email/sms adapters
│  │  ├─ email.service.ts           # nodemailer (adapter); templating
│  │  └─ clock.ts                   # now(), timezone helpers → easy to mock in tests
│  │
│  ├─ controllers/                  # HTTP layer (Express) – validate, call services, shape responses
│  │  ├─ auth/
│  │  │  ├─ validators.ts           # Zod DTOs for /signup, /login, /refresh
│  │  │  ├─ controller.ts           # handlers (thin): uses auth.service
│  │  │  ├─ routes.ts               # mounts /auth endpoints
│  │  │  └─ tests/
│  │  │     ├─ unit.test.ts
│  │  │     └─ e2e.test.ts
│  │  ├─ users/
│  │  │  ├─ validators.ts           # update profile, change role (admin-only)
│  │  │  ├─ controller.ts
│  │  │  ├─ routes.ts               # /users, /me
│  │  │  └─ tests/
│  │  ├─ availability/
│  │  │  ├─ validators.ts           # create/update weekly availability, exceptions
│  │  │  ├─ controller.ts
│  │  │  ├─ routes.ts               # /doctors/:id/weekly-availability, /slot-exceptions
│  │  │  └─ tests/
│  │  ├─ slots/
│  │  │  ├─ validators.ts           # slot generation/regeneration requests
│  │  │  ├─ controller.ts
│  │  │  ├─ routes.ts               # /doctors/:id/slots, /search?spec=...&from=...
│  │  │  └─ tests/
│  │  ├─ appointments/
│  │  │  ├─ validators.ts           # book/cancel/reschedule payloads
│  │  │  ├─ controller.ts
│  │  │  ├─ routes.ts               # /appointments
│  │  │  └─ tests/
│  │  └─ index.ts                   # root router – imports all feature routes
│  │
│  ├─ middleware/
│  │  ├─ authenticate.ts            # verify JWT; attaches req.user
│  │  ├─ authorizeRole.ts           # role guard (doctor/patient/admin)
│  │  ├─ validate.ts                # zod middleware wrapper (req.body/params/query)
│  │  ├─ errorHandler.ts            # central error → JSON shape
│  │  ├─ notFound.ts                # 404 handler
│  │  └─ requestLogger.ts           # tiny logger or morgan integration
│  │
│  ├─ libs/
│  │  ├─ jwt/
│  │  │  └─ index.ts                # custom HS256 sign/verify/decode
│  │  ├─ password.ts                # scrypt hash/verify
│  │  ├─ mailer.ts                  # nodemailer transport factory
│  │  └─ logger.ts                  # pino/winston thin wrapper
│  │
│  ├─ utils/
│  │  ├─ time.ts                    # tz conversions, truncation, ISO helpers
│  │  ├─ pagination.ts              # limit/offset & cursors
│  │  ├─ ids.ts                     # uuid helpers
│  │  └─ http.ts                    # common response helpers
│  │
│  ├─ jobs/                         # background jobs (cron/queue)
│  │  └─ reminders.job.ts           # 24h-before reminders (invokes notifications.service)
│  │
│  ├─ types/
│  │  └─ express.d.ts               # declare global augmentation for req.user
│  │
│  └─ routes.ts                     # (optional) if you prefer a single place to attach routers
│
├─ tests/                           # cross-cutting tests (if not kept under controllers/*/tests)
│  ├─ unit/
│  ├─ integration/                  # hits real DB (spins Docker or test schema)
│  └─ e2e/                          # supertest against running API
│
├─ scripts/
│  ├─ wait-db.ts                    # poll DB readiness for CI/compose
│  └─ seed.ts                       # optional app-level seeding (if not using SQL seed)
│
├─ docs/
│  ├─ 02-AUTH.md
│  ├─ 03-DB-DIAGRAM.md
│  └─ 04-DB-SETUP-MIGRATIONS.md
│
├─ docker-compose.yml               # db + api (one-command up)
├─ Dockerfile                       # multi-stage: build → runtime
├─ .github/workflows/ci.yml         # bring up Postgres, run create-db + migrate + tests
├─ .env.example
├─ .gitignore
├─ package.json
├─ tsconfig.json
└─ README.md
```


Awesome—here’s a clean, production-ready folder layout for your Hospital Appointment Scheduler that matches your preferences (controllers per entity, Zod entities, SQL repositories, services for domain logic & emails) and scales nicely.

.
├─ src/
│  ├─ index.ts                      # process bootstrap (reads config, creates DB, creates app, listen)
│  ├─ app.ts                        # Express wiring (routes, middleware) – accepts `db` instance
│  │
│  ├─ config/
│  │  └─ env.ts                     # unified config (PORT, DATABASE_URL, JWT, etc) via zod
│  │
│  ├─ database/
│  │  ├─ index.ts                   # createDatabase(): pg Pool wrapper (+withTransaction)
│  │  ├─ create-db.ts               # connects to admin DB; CREATE DATABASE if missing
│  │  ├─ migrate/
│  │  │  └─ migrate.ts              # runs SQL files in order (with optional ledger/checksums)
│  │  └─ migrations/
│  │     ├─ 00_extensions.sql
│  │     ├─ 01_types.sql
│  │     ├─ 02_tables.sql
│  │     ├─ 03_constraints.sql
│  │     ├─ 04_indexes.sql
│  │     └─ 05_seed.sql
│  │
│  ├─ entities/                     # Pure domain types/schemas (Zod) – NO I/O here
│  │  ├─ user.ts                    # z.userSchema, Role enum, helpers (parseUser)
│  │  ├─ specialization.ts
│  │  ├─ doctorSpecialization.ts
│  │  ├─ weeklyAvailability.ts      # weekday, start_time, end_time, duration, timezone
│  │  ├─ slotException.ts
│  │  ├─ availabilitySlot.ts
│  │  ├─ appointment.ts
│  │  └─ token.ts                   # refresh token record schema
│  │
│  ├─ repositories/                 # Pure DB access (SQL only; no HTTP/Express)
│  │  ├─ users.repo.ts
│  │  ├─ specializations.repo.ts
│  │  ├─ doctorSpecializations.repo.ts
│  │  ├─ weeklyAvailability.repo.ts
│  │  ├─ slotExceptions.repo.ts
│  │  ├─ availabilitySlots.repo.ts
│  │  ├─ appointments.repo.ts
│  │  └─ refreshTokens.repo.ts
│  │
│  ├─ services/                     # Business logic (compose repositories, invariants, transactions)
│  │  ├─ auth.service.ts            # signup/login/refresh/logout; password hash; token rotation
│  │  ├─ users.service.ts           # profile, role upgrade (admin-only), token_version bump
│  │  ├─ availability.service.ts    # CRUD weekly templates & exceptions + validation
│  │  ├─ slotting.service.ts        # generate/regen availability_slots (rolling horizon)
│  │  ├─ appointments.service.ts    # book/cancel/reschedule (uses withTransaction)
│  │  ├─ notifications.service.ts   # orchestrates reminders; calls email/sms adapters
│  │  ├─ email.service.ts           # nodemailer (adapter); templating
│  │  └─ clock.ts                   # now(), timezone helpers → easy to mock in tests
│  │
│  ├─ controllers/                  # HTTP layer (Express) – validate, call services, shape responses
│  │  ├─ auth/
│  │  │  ├─ validators.ts           # Zod DTOs for /signup, /login, /refresh
│  │  │  ├─ controller.ts           # handlers (thin): uses auth.service
│  │  │  ├─ routes.ts               # mounts /auth endpoints
│  │  │  └─ tests/
│  │  │     ├─ unit.test.ts
│  │  │     └─ e2e.test.ts
│  │  ├─ users/
│  │  │  ├─ validators.ts           # update profile, change role (admin-only)
│  │  │  ├─ controller.ts
│  │  │  ├─ routes.ts               # /users, /me
│  │  │  └─ tests/
│  │  ├─ availability/
│  │  │  ├─ validators.ts           # create/update weekly availability, exceptions
│  │  │  ├─ controller.ts
│  │  │  ├─ routes.ts               # /doctors/:id/weekly-availability, /slot-exceptions
│  │  │  └─ tests/
│  │  ├─ slots/
│  │  │  ├─ validators.ts           # slot generation/regeneration requests
│  │  │  ├─ controller.ts
│  │  │  ├─ routes.ts               # /doctors/:id/slots, /search?spec=...&from=...
│  │  │  └─ tests/
│  │  ├─ appointments/
│  │  │  ├─ validators.ts           # book/cancel/reschedule payloads
│  │  │  ├─ controller.ts
│  │  │  ├─ routes.ts               # /appointments
│  │  │  └─ tests/
│  │  └─ index.ts                   # root router – imports all feature routes
│  │
│  ├─ middleware/
│  │  ├─ authenticate.ts            # verify JWT; attaches req.user
│  │  ├─ authorizeRole.ts           # role guard (doctor/patient/admin)
│  │  ├─ validate.ts                # zod middleware wrapper (req.body/params/query)
│  │  ├─ errorHandler.ts            # central error → JSON shape
│  │  ├─ notFound.ts                # 404 handler
│  │  └─ requestLogger.ts           # tiny logger or morgan integration
│  │
│  ├─ libs/
│  │  ├─ jwt/
│  │  │  └─ index.ts                # custom HS256 sign/verify/decode
│  │  ├─ password.ts                # scrypt hash/verify
│  │  ├─ mailer.ts                  # nodemailer transport factory
│  │  └─ logger.ts                  # pino/winston thin wrapper
│  │
│  ├─ utils/
│  │  ├─ time.ts                    # tz conversions, truncation, ISO helpers
│  │  ├─ pagination.ts              # limit/offset & cursors
│  │  ├─ ids.ts                     # uuid helpers
│  │  └─ http.ts                    # common response helpers
│  │
│  ├─ jobs/                         # background jobs (cron/queue)
│  │  └─ reminders.job.ts           # 24h-before reminders (invokes notifications.service)
│  │
│  ├─ types/
│  │  └─ express.d.ts               # declare global augmentation for req.user
│  │
│  └─ routes.ts                     # (optional) if you prefer a single place to attach routers
│
├─ tests/                           # cross-cutting tests (if not kept under controllers/*/tests)
│  ├─ unit/
│  ├─ integration/                  # hits real DB (spins Docker or test schema)
│  └─ e2e/                          # supertest against running API
│
├─ scripts/
│  ├─ wait-db.ts                    # poll DB readiness for CI/compose
│  └─ seed.ts                       # optional app-level seeding (if not using SQL seed)
│
├─ docs/
│  ├─ 02-AUTH.md
│  ├─ 03-DB-DIAGRAM.md
│  └─ 04-DB-SETUP-MIGRATIONS.md
│
├─ docker-compose.yml               # db + api (one-command up)
├─ Dockerfile                       # multi-stage: build → runtime
├─ .github/workflows/ci.yml         # bring up Postgres, run create-db + migrate + tests
├─ .env.example
├─ .gitignore
├─ package.json
├─ tsconfig.json
└─ README.md

What goes where (quick mental model)
	•	entities/: Zod schemas & domain types only. No Express, no DB calls. Reusable in services & controllers.
	•	repositories/: Raw SQL using db.query. One repo per table/aggregate. No business logic.
	•	services/: Business logic & invariants. Compose multiple repos. Use db.withTransaction for booking/rescheduling to prevent double-booking.
	•	controllers/: Thin HTTP handlers. Validate with Zod, call service, map outputs. One subfolder per feature (auth, users, availability, slots, appointments).
	•	middleware/: AuthN/Z, validation, error handling.
	•	libs/: Cross-cutting implementations (jwt, password, mailer, logger).
	•	utils/: Generic helpers (time, pagination, ids).
	•	database/: DB creation, migrations, seeds; createDatabase wrapper.
	•	jobs/: Background tasks (e.g., reminder emails 24h before appointment).
	•	tests/: Unit (entities/services), integration (repos against DB), e2e (API via supertest).

Example: a single feature flow (Appointments)
	•	entities/appointment.ts
Zod schemas: appointmentCreateDto, appointmentStatus, etc.
	•	repositories/appointments.repo.ts
SQL for CRUD (insert, findById, updateStatus, search by patient, etc.).
	•	services/appointments.service.ts
book(patientId, slotId):
	•	In a transaction: check slot exists & is_booked=false → set is_booked=true → insert appointment → commit.
	•	On cancel: mark appointment canceled, free availability_slots.is_booked=false.
	•	controllers/appointments/controller.ts
Uses validate(bodySchema) middleware, calls appointments.service, returns standardized JSON.
	•	controllers/appointments/routes.ts
Mounts endpoints; protects with authenticate and role guards.

Suggested HTTP surface (for later)
	•	POST /auth/signup POST /auth/login POST /auth/refresh POST /auth/logout GET /profile
	•	GET /specializations
	•	GET /doctors/:id/weekly-availability POST /doctors/:id/weekly-availability
	•	POST /doctors/:id/slot-exceptions
	•	POST /doctors/:id/slots/regenerate?weeks=6
	•	GET /slots/search?specializationId=...&from=...&to=...
	•	POST /appointments PATCH /appointments/:id/cancel PATCH /appointments/:id/reschedule

A few best-practice tips baked into this layout
	•	DTO validation at the edge: controllers/*/validators.ts with Zod, used by a shared validate() middleware.
	•	Transactions for booking/rescheduling: wrap in db.withTransaction to enforce “one appointment per slot”.
	•	Role safety: self-signup defaults to patient; doctor/admin role assignment is admin-only.
	•	Token revocation: consider token_version bump in users on password change; enforce on JWT verify in authenticate.
	•	Clock abstraction: services/clock.ts to make reminder logic testable.
	•	Tests close to code: quick unit tests under controllers/<feature>/tests + shared integration/e2e under /tests.

If you want, I can also generate stub files (empty TS modules with exports) for each path so you can start filling code without creating folders manually.