-- Practical length limits (business rules), still using text/citext
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='users_email_len_chk') THEN
    ALTER TABLE users ADD CONSTRAINT users_email_len_chk CHECK (length(email) <= 254);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='users_username_len_chk') THEN
    ALTER TABLE users ADD CONSTRAINT users_username_len_chk CHECK (username IS NULL OR length(username) <= 50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='users_pw_len_chk') THEN
    ALTER TABLE users ADD CONSTRAINT users_pw_len_chk CHECK (length(password_hash) <= 255);
  END IF;
END$$;

-- Weekly availability consistency
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='wa_time_chk') THEN
    ALTER TABLE weekly_availability ADD CONSTRAINT wa_time_chk CHECK (end_time > start_time);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='wa_unique_tpl') THEN
    ALTER TABLE weekly_availability ADD CONSTRAINT wa_unique_tpl UNIQUE (doctor_id, weekday, start_time, end_time);
  END IF;
END$$;

-- Slot rules
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='slot_time_chk') THEN
    ALTER TABLE availability_slots ADD CONSTRAINT slot_time_chk CHECK (end_time > start_time);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='slot_unique_start') THEN
    ALTER TABLE availability_slots ADD CONSTRAINT slot_unique_start UNIQUE (doctor_id, start_time);
  END IF;
END$$;

-- Appointment: exactly one per slot
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='appt_unique_slot') THEN
    ALTER TABLE appointments ADD CONSTRAINT appt_unique_slot UNIQUE (availability_slot_id);
  END IF;
END$$;

-- Slot exceptions rules
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ex_times_present_chk') THEN
    ALTER TABLE slot_exceptions ADD CONSTRAINT ex_times_present_chk
      CHECK (full_day OR (start_time IS NOT NULL AND end_time IS NOT NULL));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ex_time_order_chk') THEN
    ALTER TABLE slot_exceptions ADD CONSTRAINT ex_time_order_chk
      CHECK (full_day OR end_time > start_time);
  END IF;
END$$;