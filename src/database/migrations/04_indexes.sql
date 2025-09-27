CREATE INDEX IF NOT EXISTS idx_slots_spec_time
  ON availability_slots(specialization_id, start_time);

CREATE INDEX IF NOT EXISTS idx_slots_doctor_time
  ON availability_slots(doctor_id, start_time);

CREATE INDEX IF NOT EXISTS idx_appt_patient
  ON appointments(patient_id, booked_at);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rt_user_hash
  ON refresh_tokens(user_id, token_hash);

CREATE INDEX IF NOT EXISTS idx_rt_user_expires
  ON refresh_tokens(user_id, expires_at);

CREATE UNIQUE INDEX IF NOT EXISTS ux_slots_doctor_start ON availability_slots(doctor_id, start_time);