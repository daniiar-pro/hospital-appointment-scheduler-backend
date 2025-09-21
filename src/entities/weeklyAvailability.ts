import { z } from "zod";
import type { WeeklyAvailabilityRow } from "../database/types.js";

export const weeklyAvailabilitySchema = z
  .object({
    id: z.uuid(),
    doctorId: z.uuid(),
    weekday: z.number().int().min(0).max(6), // 0..6 (Sun..Sat)
    startTime: z.iso.time(),
    endTime: z.iso.time(),
    slotDurationMins: z.number().int().min(5).max(480),
    timezone: z.string().min(1), // e.g., "Europe/Istanbul"
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .refine((v) => v.startTime < v.endTime, {
    message: "endTime must be greater than startTime",
    path: ["endTime"],
  });

export type WeeklyAvailability = z.infer<typeof weeklyAvailabilitySchema>;

export function mapWeeklyAvailabilityRow(
  row: WeeklyAvailabilityRow
): WeeklyAvailability {
  return {
    id: row.id,
    doctorId: row.doctor_id,
    weekday: row.weekday,
    startTime: row.start_time,
    endTime: row.end_time,
    slotDurationMins: row.slot_duration_mins,
    timezone: row.timezone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const upsertWeeklyAvailabilityDto = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startTime: z.iso.time(),
    endTime: z.iso.time(),
    slotDurationMins: z.number().int().min(5).max(480),
    timezone: z.string().min(1),
  })
  .refine((v) => v.startTime < v.endTime, {
    message: "endTime must be greater than startTime",
    path: ["endTime"],
  });

export type UpsertWeeklyAvailabilityDto = z.infer<
  typeof upsertWeeklyAvailabilityDto
>;
