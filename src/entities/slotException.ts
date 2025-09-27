import { z } from "zod";
import type { SlotExceptionRow } from "../database/types.js";

export const slotExceptionSchema = z
  .object({
    id: z.uuid(),
    doctorId: z.uuid(),
    day: z.iso.date(),
    startTime: z.iso.time().nullable().optional(),
    endTime: z.iso.time().nullable().optional(),
    fullDay: z.boolean(),
    reason: z.string().max(300).nullable().optional(),
  })
  .refine(
    (v) => {
      if (v.fullDay) {
        return !v.startTime && !v.endTime;
      }
      return !!v.startTime && !!v.endTime && v.startTime < v.endTime;
    },
    {
      message: "For partial blocks, provide startTime<endTime; for fullDay, omit times.",
    },
  );

export type SlotException = z.infer<typeof slotExceptionSchema>;

export function mapSlotExceptionRow(row: SlotExceptionRow): SlotException {
  return {
    id: row.id,
    doctorId: row.doctor_id,
    day: row.day,
    startTime: row.start_time,
    endTime: row.end_time,
    fullDay: row.full_day,
    reason: row.reason ?? null,
  };
}

export const upsertSlotExceptionDto = z
  .object({
    day: z.iso.date(),
    fullDay: z.boolean(),
    startTime: z.iso.time().nullable().optional(),
    endTime: z.iso.time().nullable().optional(),
    reason: z.string().max(300).nullable().optional(),
  })
  .refine(
    (v) => {
      if (v.fullDay) {
        return !v.startTime && !v.endTime;
      }
      return !!v.startTime && !!v.endTime && v.startTime < v.endTime;
    },
    {
      message: "For partial blocks, provide startTime<endTime; for fullDay, omit times.",
    },
  );

export type UpsertSlotExceptionDto = z.infer<typeof upsertSlotExceptionDto>;
