-- USERS
CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext NOT NULL UNIQUE,                       -- case-insensitive
  password_hash text   NOT NULL,
  role          user_role NOT NULL DEFAULT 'patient',         -- safer default
  username      text,                                        
  token_version int    NOT NULL DEFAULT 0,                    -- for JWT instant revoke
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- SPECIALIZATIONS
CREATE TABLE IF NOT EXISTS specializations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  description text
);

-- DOCTOR_SPECIALIZATIONS (M:N)
CREATE TABLE IF NOT EXISTS doctor_specializations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  specialization_id  uuid NOT NULL REFERENCES specializations(id) ON DELETE CASCADE,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- WEEKLY_AVAILABILITY (recurring)
CREATE TABLE IF NOT EXISTS weekly_availability (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday             smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time          time NOT NULL,
  end_time            time NOT NULL,
  slot_duration_mins  smallint NOT NULL CHECK (slot_duration_mins > 0),
  timezone            text NOT NULL DEFAULT 'UTC',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- SLOT_EXCEPTIONS (one-offs)
CREATE TABLE IF NOT EXISTS slot_exceptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day        date NOT NULL,
  start_time time,
  end_time   time,
  full_day   boolean NOT NULL DEFAULT false,
  reason     text
);

-- AVAILABILITY_SLOTS (concrete slots)
CREATE TABLE IF NOT EXISTS availability_slots (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  specialization_id  uuid NOT NULL REFERENCES specializations(id) ON DELETE RESTRICT,
  start_time         timestamptz NOT NULL,
  end_time           timestamptz NOT NULL,
  duration_mins      smallint NOT NULL,
  is_booked          boolean NOT NULL DEFAULT false,
  source             text, -- 'generated' | 'manual' (optional)
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- APPOINTMENTS (one slot → at most one appointment)
CREATE TABLE IF NOT EXISTS appointments (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  availability_slot_id uuid NOT NULL REFERENCES availability_slots(id) ON DELETE RESTRICT,
  patient_id           uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status               appointment_status NOT NULL DEFAULT 'confirmed',
  symptoms             text,
  notes                text,
  booked_at            timestamptz NOT NULL DEFAULT now(),
  canceled_at          timestamptz
);

-- REFRESH_TOKENS (replace JSON store)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL,
  user_agent  text,
  ip_address  inet,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);