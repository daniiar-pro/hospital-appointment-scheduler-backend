export type UUID = string;

export interface UserRow {
  id: UUID;
  username: string;
  email: string; // citext → string
  password_hash: string;
  role: "admin" | "doctor" | "patient";
  token_version: number;
  created_at: string; // timestamptz → string (ISO) by default in node-postgres
  updated_at: string;
}

export interface SpecializationRow {
  id: UUID;
  name: string;
  description: string | null;
}

export interface DoctorSpecializationRow {
  id: UUID;
  doctor_id: UUID;
  specialization_id: UUID;
  created_at: string;
}

export interface WeeklyAvailabilityRow {
  id: UUID;
  doctor_id: UUID;
  weekday: number; // 0..6
  start_time: string; // "HH:MM:SS"
  end_time: string; // "HH:MM:SS"
  slot_duration_mins: number;
  timezone: string; // "Europe/Istanbul"
  created_at: string;
  updated_at: string;
}

export interface SlotExceptionRow {
  id: UUID;
  doctor_id: UUID;
  day: string; // "YYYY-MM-DD"
  start_time: string | null;
  end_time: string | null;
  full_day: boolean;
  reason: string | null;
}

export interface AvailabilitySlotRow {
  id: UUID;
  doctor_id: UUID;
  specialization_id: UUID;
  start_time: string; // timestamptz
  end_time: string; // timestamptz
  duration_mins: number;
  is_booked: boolean;
  source: "generated" | "manual" | null;
  created_at: string;
}

export interface AppointmentRow {
  id: UUID;
  availability_slot_id: UUID; // unique
  patient_id: UUID;
  status: "pending" | "confirmed" | "canceled" | "completed";
  symptoms: string | null;
  notes: string | null;
  booked_at: string;
  cancelled_at: string | null;
}

export interface RefreshTokenRow {
  id: UUID;
  user_id: UUID;
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
  user_agent: string | null;
  ip: string | null;
}
