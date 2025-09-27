import type { Database } from "../database/index.js";
import type { WeeklyAvailabilityRow } from "../database/types.js";

export function weeklyAvailabilityRepository(db: Database) {
  return {
    async list(doctorId: string) {
      const q = `
        SELECT id, doctor_id, weekday, start_time, end_time, slot_duration_mins, timezone, created_at, updated_at
        FROM weekly_availability
        WHERE doctor_id = $1
        ORDER BY weekday ASC, start_time ASC
      `;
      return db.query<WeeklyAvailabilityRow>(q, [doctorId]).then((r) => r.rows);
    },

    async upsert(
      doctorId: string,
      rows: Array<{
        weekday: number;
        start_time: string;
        end_time: string;
        slot_duration_mins: number;
        timezone: string;
      }>,
    ) {
      await db.query(`DELETE FROM weekly_availability WHERE doctor_id = $1`, [doctorId]);
      if (!rows.length) {
        return [];
      }
      const values: any[] = [];
      const tuples = rows.map((r, i) => {
        const base = i * 6;
        values.push(
          doctorId,
          r.weekday,
          r.start_time,
          r.end_time,
          r.slot_duration_mins,
          r.timezone,
        );
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${
          base + 5
        }, $${base + 6})`;
      });
      const q = `
        INSERT INTO weekly_availability (doctor_id, weekday, start_time, end_time, slot_duration_mins, timezone)
        VALUES ${tuples.join(", ")}
        RETURNING id, doctor_id, weekday, start_time, end_time, slot_duration_mins, timezone, created_at, updated_at
      `;
      const { rows: inserted } = await db.query<WeeklyAvailabilityRow>(q, values);
      return inserted;
    },
  };
}
