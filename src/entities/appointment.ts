import { z } from "zod";
import type { AppointmentRow } from "../database/types.js";

export const appointmentStatusEnum = z.enum([
  "pending",
  "confirmed",
  "canceled",
  "completed",
]);
export type AppointmentStatus = z.infer<typeof appointmentStatusEnum>;

export const appointmentSchema = z.object({
  id: z.uuid(),
  availabilitySlotId: z.uuid(),
  patientId: z.uuid(),
  status: appointmentStatusEnum,
  symptoms: z.string().max(2000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  bookedAt: z.iso.datetime({ offset: true }),
  cancelledAt: z.iso.datetime({ offset: true }).nullable().optional(),
});
export type Appointment = z.infer<typeof appointmentSchema>;

export function mapAppointmentRow(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    availabilitySlotId: row.availability_slot_id,
    patientId: row.patient_id,
    status: row.status,
    symptoms: row.symptoms ?? null,
    notes: row.notes ?? null,
    bookedAt: row.booked_at,
    cancelledAt: row.cancelled_at ?? null,
  };
}

export const createAppointmentDto = z.object({
  availabilitySlotId: z.uuid(),
  symptoms: z.string().max(2000).optional(),
});
export type CreateAppointmentDto = z.infer<typeof createAppointmentDto>;

export const cancelAppointmentDto = z.object({
  reason: z.string().max(500).optional(),
});
export type CancelAppointmentDto = z.infer<typeof cancelAppointmentDto>;
