import type { Database } from "../database/index.js";
import type { SlotExceptionRow } from "../database/types.js";

export function slotExceptionsRepository(db: Database) {
  return {
    async list(doctorId: string) {
      const q = `
        SELECT id, doctor_id, day, start_time, end_time, full_day, reason
        FROM slot_exceptions
        WHERE doctor_id = $1
        ORDER BY day DESC, start_time NULLS FIRST
      `;
      return db.query<SlotExceptionRow>(q, [doctorId]).then((r) => r.rows);
    },

    async create(
      doctorId: string,
      data: {
        day: string;
        full_day: boolean;
        start_time?: string | null;
        end_time?: string | null;
        reason?: string | null;
      },
    ) {
      const q = `
        INSERT INTO slot_exceptions (doctor_id, day, start_time, end_time, full_day, reason)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, doctor_id, day, start_time, end_time, full_day, reason
      `;
      const { rows } = await db.query<SlotExceptionRow>(q, [
        doctorId,
        data.day,
        data.start_time ?? null,
        data.end_time ?? null,
        data.full_day,
        data.reason ?? null,
      ]);
      return rows[0];
    },

    async remove(id: string, doctorId: string) {
      const { rowCount } = await db.query(
        `DELETE FROM slot_exceptions WHERE id = $1 AND doctor_id = $2`,
        [id, doctorId],
      );
      return rowCount ? true : false;
    },
  };
}
