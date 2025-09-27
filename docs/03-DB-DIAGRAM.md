# Data Modeling

## Table of Contents

- [Database](#database)
- [Entity Relationship Diagram](#entity-relationship-diagram)
- [Tables](#tables)
  - [Users](#1-users)
  - [Specializations](#2-specializations)
  - [Doctor_specializations](#3-doctor_specializations)
  - [Weekly_availability](#4-weekly_availability)
  - [Slot_exceptions](#5-slot_exceptions)
  - [Availability_slots](#6-availability_slots)
  - [Appointments](#7-appointments)
  - [Refresh_tokens](#8-refresh_tokens)
- [Types](#types--enumeration-)
  - [User role](#1-user-role)
  - [Appointment status](#2-appointment-status)
- [Relationships](#relationships)

---

## Database

- Database - PostgreSQL

## Entity Relationship Diagram

![data-modeling](../database_diagram.png)

```mermaid
erDiagram
  USERS {
    uuid id PK
    text username
    text email "UNIQUE"
    text password
    user_role role
    int token_version
    timestamptz created_at
    timestamptz updated_at
  }

  SPECIALIZATIONS {
    uuid id PK
    text name "UNIQUE"
    text description
  }

  DOCTOR_SPECIALIZATIONS {
    uuid id PK
    uuid doctor_id FK "-> USERS.id"
    uuid specialization_id FK "-> SPECIALIZATIONS.id"
    timestamptz created_at
  }

  WEEKLY_AVAILABILITY {
    uuid id PK
    uuid doctor_id FK "-> USERS.id"
    smallint weekday "0=Sun..6=Sat"
    time start_time
    time end_time
    smallint slot_duration_mins
    text timezone
    timestamptz created_at
    timestamptz updated_at
  }

  SLOT_EXCEPTIONS {
    uuid id PK
    uuid doctor_id FK "-> USERS.id"
    date day
    time start_time
    time end_time
    boolean full_day
    text reason
  }

  AVAILABILITY_SLOTS {
    uuid id PK
    uuid doctor_id FK "-> USERS.id"
    uuid specialization_id FK "-> SPECIALIZATIONS.id"
    timestamptz start_time
    timestamptz end_time
    smallint duration_mins
    boolean is_booked
    text source
    timestamptz created_at
  }

  APPOINTMENTS {
    uuid id PK
    uuid availability_slot_id FK "-> AVAILABILITY_SLOTS.id (UNIQUE)"
    uuid patient_id FK "-> USERS.id"
    appointment_status status
    text symptoms
    text notes
    timestamptz booked_at
    timestamptz cancelled_at
  }

  REFRESH_TOKENS {
    uuid id PK
    uuid user_id FK "-> USERS.id"
    text token_hash
    timestamptz expires_at
    timestamptz revoked_at
    timestamptz created_at
  }

  USER_ROLE {
    enum admin
    enum doctor
    enum patient
  }

  APPOINTMENT_STATUS {
    enum pending
    enum confirmed
    enum cancelled
    enum completed
  }

  %% Relationships
  USERS ||--o{ WEEKLY_AVAILABILITY : "doctor"
  USERS ||--o{ SLOT_EXCEPTIONS     : "doctor"
  USERS ||--o{ AVAILABILITY_SLOTS  : "doctor"
  SPECIALIZATIONS ||--o{ AVAILABILITY_SLOTS : "specialty"
  AVAILABILITY_SLOTS ||--o| APPOINTMENTS    : "booked once"
  USERS ||--o{ APPOINTMENTS        : "patient"
  USERS ||--o{ DOCTOR_SPECIALIZATIONS : "doctor"
  SPECIALIZATIONS ||--o{ DOCTOR_SPECIALIZATIONS : "is in"
  USERS ||--o{ REFRESH_TOKENS      : "has tokens"
```

## Tables

### 1. Users

Stores all accounts: admin, doctor, patient.

| Key | Column Name   | Data Type   | Description                           |
| --- | ------------- | ----------- | ------------------------------------- |
| PK  | id            | uuid        | Primary key                           |
|     | username      | text        | Display name                          |
|     | email         | text        | Unique user email                     |
|     | password      | text        | Hashed password                       |
|     | role          | user_role   | User's role                           |
|     | token_version | int         | For instant access-token invalidation |
|     | created_at    | timestamptz | Record created                        |
|     | updated_at    | timestamptz | Record updated                        |

### 2. Specializations

Controlled vocabulary for doctor specialties.

| Key | Column Name | Data Type | Description                |
| --- | ----------- | --------- | -------------------------- |
| PK  | id          | uuid      | Primary Key                |
|     | name        | text      | Unique specialization name |
|     | description | text      | Optional description       |

### 3. Doctor_specializations

M:N link between doctors and specializations.

| Key | Column Name       | Data Type   | Description             |
| --- | ----------------- | ----------- | ----------------------- |
| PK  | id                | uuid        | Primary key             |
| FK  | doctor_id         | uuid        | FK → users.id (doctor)  |
| FK  | specialization_id | uuid        | FK → specializations.id |
|     | created_at        | timestamptz | Record created          |

### 4. Weekly_availability

Doctor’s recurring working hours (templates used to generate slots).

| Key | Column Name        | Data Type   | Description                           |
| --- | ------------------ | ----------- | ------------------------------------- |
| PK  | id                 | uuid        | Primary key                           |
| FK  | doctor_id          | uuid        | FK → users.id (doctor)                |
|     | weekday            | smallint    | 0..6 (Sun..Sat)                       |
|     | start_time         | time        | Local start time                      |
|     | end_time           | time        | Local end time (must be > start_time) |
|     | slot_duration_mins | smallint    | e.g., 15/20/30                        |
|     | timezone           | text        | e.g., Europe/Istanbul                 |
|     | created_at         | timestamptz | Record created                        |
|     | updated_at         | timestamptz | Record updated                        |

### 5. Slot_exceptions

One-off overrides to the weekly template (vacations, clinics, partial blocks).

| Key | Column Name | Data Type | Description                                                  |
| --- | ----------- | --------- | ------------------------------------------------------------ |
| PK  | id          | uuid      | Primary key                                                  |
| FK  | doctor_id   | uuid      | FK → users.id (doctor)                                       |
|     | day         | date      | The date affected                                            |
|     | start_time  | time      | Optional start (required if full_day = false)                |
|     | end_time    | time      | Optional end (required if full_day = false, must be > start) |
|     | full_day    | boolean   | If true, the whole day is blocked                            |
|     | reason      | text      | Optional note                                                |

### 6. Availability_slots

Concrete bookable slots (rolling horizon). One slot can be booked at most once.

| Key | Column Name       | Data Type   | Description                              |
| --- | ----------------- | ----------- | ---------------------------------------- | ------------------- |
| PK  | id                | uuid        | Primary key                              |
| FK  | doctor_id         | uuid        | FK → users.id (doctor)                   |
| FK  | specialization_id | uuid        | FK → specializations.id                  |
|     | start_time        | timestamptz | Absolute start time                      |
|     | end_time          | timestamptz | Absolute end time (must be > start_time) |
|     | duration_mins     | smallint    | For quick reads                          |
|     | is_booked         | boolean     | Cached availability flag                 |
|     | source            | text        | 'generated'                              | 'manual' (optional) |
|     | created_at        | timestamptz | Record updated                           |

### 7. Appointments

A patient booking a slot.

| Key | Column Name          | Data Type          | Description                           |
| --- | -------------------- | ------------------ | ------------------------------------- |
| PK  | id                   | uuid               | Primary key                           |
| FK  | availability_slot_id | uuid               | UNIQUE FK → availability_slots.id     |
| FK  | patient_id           | uuid               | FK → users.id (patient)               |
|     | status               | appointment_status | Appointment status                    |
|     | symptoms             | text               | Optional notes from patient           |
|     | notes                | text               | Staff/doctor notes                    |
|     | booked_at            | timestamptz        | When the appointment was created      |
|     | cancelled_at         | timestamptz        | When it was cancelled (if applicable) |

UNIQUE (availability_slot_id) enforces one appointment per slot.

### 8. Refresh_tokens

Server-side store for hashed refresh tokens (replaces JSON files).

| Key | Column Name | Data Type   | Description                                 |
| --- | ----------- | ----------- | ------------------------------------------- |
| PK  | id          | uuid        | Primary key                                 |
| FK  | user_id     | uuid        | FK → users.id                               |
|     | token_hash  | text        | Hash of the refresh token (never plaintext) |
|     | expires_at  | timestamptz | Expiration                                  |
|     | revoked_at  | timestamptz | Revocation time (if revoked)                |
|     | created_at  | timestamptz | Record created                              |

## Types (Enumeration)

### 1. User role

| user_role |
| --------- |
| admin     |
| doctor    |
| patient   |

### 2. Appointment status

| appointment_status |
| ------------------ |
| pending            |
| confirmed          |
| cancelled          |
| completed          |

## Relationships

The relationships between the tables are:

- Users (doctor) ⟶ Weekly_availability (one-to-many)
  One doctor can define many weekly templates
  at weekly_availability(doctor_id).
- Users (doctor) ⟶ Slot_exceptions (one-to-many)
  One doctor can create many one-off overrides (vacation/blocked hours)
  at slot_exceptions(doctor_id).
- Users (doctor) ⟶ Availability_slots (one-to-many)
  One doctor owns many concrete bookable slots
  at availability_slots(doctor_id).
- Specializations ⟶ Availability_slots (one-to-many)
  Each slot is for exactly one specialization
  at availability_slots(specialization_id).
- Availability_slots ⟶ Appointments (one-to-zero/one)
  A slot can be booked at most once
  at appointments(availability_slot_id) (with a UNIQUE constraint on availability_slot_id).
- Users (patient) ⟶ Appointments (one-to-many)
  A patient can have many appointments over time
  at appointments(patient_id).
- Users (doctor) ⟷ Specializations (many-to-many) via Doctor_specializations
  A doctor can have many specializations, and a specialization can have many doctors,
  through doctor_specializations with fields doctor_id and specialization_id.
  (You’re using a single-column PK id in this table—fine. Optionally add a UNIQUE on (doctor_id, specialization_id) to prevent duplicates.)
- Users ⟶ Refresh_tokens (one-to-many)
  A user can have multiple refresh tokens (devices/browsers)
  at refresh_tokens(user_id).
