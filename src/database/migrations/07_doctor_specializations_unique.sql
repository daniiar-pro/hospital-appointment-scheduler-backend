BEGIN;

-- 1) Remove duplicates, keep one row per (doctor_id, specialization_id)
WITH ranked AS (
  SELECT
    id,
    doctor_id,
    specialization_id,
    ROW_NUMBER() OVER (
      PARTITION BY doctor_id, specialization_id
      ORDER BY created_at ASC
    ) AS rn
  FROM doctor_specializations
),
dupes AS (
  SELECT id FROM ranked WHERE rn > 1
)
DELETE FROM doctor_specializations
WHERE id IN (SELECT id FROM dupes);

-- 2) Create a unique index (enough for ON CONFLICT (col, col))
CREATE UNIQUE INDEX IF NOT EXISTS ux_doctor_specializations
  ON doctor_specializations (doctor_id, specialization_id);

COMMIT;