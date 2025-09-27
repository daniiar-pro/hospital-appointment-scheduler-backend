import type { Database } from "../../database/index.js";
import { DateTime, Interval } from "luxon";
import { weeklyAvailabilityRepository } from "../../repositories/weeklyAvailabilityRepository.js";
import { slotExceptionsRepository } from "../../repositories/slotExceptionsRepository.js";
import { doctorSpecializationsRepository } from "../../repositories/doctorSpecializationsRepository.js";
import { availabilitySlotsRepository } from "../../repositories/availabilitySlotsRepository.js";

export function makeSlotsService(db: Database) {
  const weekly = weeklyAvailabilityRepository(db);
  const exceptions = slotExceptionsRepository(db);
  const docSpecs = doctorSpecializationsRepository(db);
  const slotsRepo = availabilitySlotsRepository(db);

  return {
    async regenerateForDoctor(doctorId: string, weeks = 6, specializationId?: string) {
      const specs = await docSpecs.listForDoctor(doctorId);
      let specId = specializationId;
      if (!specId) {
        if (specs.length === 1) {
          specId = specs[0].specialization_id;
        } else {
          throw new Error("SPECIALIZATION_REQUIRED");
        } 
      }

      const templates = await weekly.list(doctorId);
      if (!templates.length) {
        return { inserted: 0 };
      }

      const ex = await exceptions.list(doctorId);

      const now = DateTime.utc();
      const end = now.plus({ weeks });

      const days: DateTime[] = [];
      for (let d = now.startOf("day"); d < end; d = d.plus({ days: 1 })) {
        days.push(d);
      }

      const newSlots: Array<{
        start_time: string;
        end_time: string;
        duration_mins: number;
      }> = [];

      for (const day of days) {
        // const weekday = day.weekday % 7; // Luxon: Mon=1..Sun=7; we want 0..6 (Sun..Sat)
        // map Sun->0, Mon->1 ...
        const wd = day.weekday === 7 ? 0 : day.weekday;

        const dayTemplates = templates.filter((t) => t.weekday === wd);
        if (!dayTemplates.length) {
          continue;
        }

        const dayStr = day.toISODate(); 
        const exForDay = ex.filter((e) => e.day === dayStr);

        for (const t of dayTemplates) {
          const startZ = DateTime.fromISO(`${dayStr}T${t.start_time}`, {
            zone: t.timezone,
          }).toUTC();
          const endZ = DateTime.fromISO(`${dayStr}T${t.end_time}`, {
            zone: t.timezone,
          }).toUTC();
          if (!startZ.isValid || !endZ.isValid || +endZ <= +startZ) {
            continue;
          }

          let intervals: Interval[] = [Interval.fromDateTimes(startZ, endZ)];
          for (const e of exForDay) {
            if (e.full_day) {
              intervals = [];
              break;
            }
            if (e.start_time && e.end_time) {
              const blockStart = DateTime.fromISO(`${dayStr}T${e.start_time}`, {
                zone: t.timezone,
              }).toUTC();
              const blockEnd = DateTime.fromISO(`${dayStr}T${e.end_time}`, {
                zone: t.timezone,
              }).toUTC();
              const block = Interval.fromDateTimes(blockStart, blockEnd);
              intervals = intervals.flatMap((intv) => intv.difference(block));
            }
          }
          if (!intervals.length) {
            continue;
          }

          const len = t.slot_duration_mins;
          for (const intv of intervals) {
            if (!intv?.isValid || !intv.start || !intv.end) {
              continue;
            }
            let cursor = intv.start;
            while (cursor.plus({ minutes: len }) <= intv.end) {
              const s = cursor;
              const e = cursor.plus({ minutes: len });
              newSlots.push({
                start_time: s.toISO(),
                end_time: e.toISO(),
                duration_mins: len,
              });
              cursor = e;
            }
          }
        }
      }

      if (!newSlots.length) {
        return { inserted: 0 };
      }

      const inserted = await slotsRepo.bulkInsertGenerated(doctorId, specId!, newSlots);
      return { inserted };
    },
  };
}
