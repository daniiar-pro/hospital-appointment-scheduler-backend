import { z } from "zod";
import type { AvailabilitySlotRow } from "../database/types.js";

export const slotSourceEnum = z.enum(["generated", "manual"]);
export type SlotSource = z.infer<typeof slotSourceEnum>;

export const availabilitySlotSchema = z
  .object({
    id: z.uuid(),
    doctorId: z.uuid(),
    specializationId: z.uuid(),
    startTime: z.iso.datetime({ offset: true }),
    endTime: z.iso.datetime({ offset: true }),
    durationMins: z.number().int().min(5).max(480),
    isBooked: z.boolean(),
    source: slotSourceEnum.nullable().optional(),
    createdAt: z.iso.datetime({ offset: true }),
  })
  .refine((v) => Date.parse(v.startTime) < Date.parse(v.endTime), {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });

export type AvailabilitySlot = z.infer<typeof availabilitySlotSchema>;

export function mapAvailabilitySlotRow(
  row: AvailabilitySlotRow
): AvailabilitySlot {
  return {
    id: row.id,
    doctorId: row.doctor_id,
    specializationId: row.specialization_id,
    startTime: row.start_time, // e.g "2025-01-01T10:00:00.000Z"
    endTime: row.end_time,
    durationMins: row.duration_mins,
    isBooked: row.is_booked,
    // If you chose `.nullable()` above, pass DB null through:
    // source: (row.source ?? undefined) as any,
    source: (row.source ?? undefined) as unknown as z.infer<
      typeof slotSourceEnum
    >, // 'generated' | 'manual' | null
    // If you chose `.optional()` instead, convert null→undefined:
    // source: (row.source ?? undefined) as unknown as z.infer<typeof slotSourceEnum> | undefined,
    createdAt: row.created_at,
  };
}
