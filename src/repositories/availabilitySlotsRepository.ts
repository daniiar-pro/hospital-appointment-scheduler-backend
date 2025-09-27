import type { Database } from "../database/index.js";
import type { AvailabilitySlotRow } from "../database/types.js";

export function availabilitySlotsRepository(db: Database) {
  return {
    async bulkInsertGenerated(
      doctorId: string,
      specializationId: string,
      slots: Array<{
        start_time: string;
        end_time: string;
        duration_mins: number;
      }>,
    ): Promise<number> {
      if (!slots.length) {
        return 0;
      }

      const values: any[] = [];
      const tuples = slots.map((s, i) => {
        const base = i * 6;
        values.push(
          doctorId,
          specializationId,
          s.start_time,
          s.end_time,
          s.duration_mins,
          "generated",
        );
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${
          base + 5
        }, $${base + 6})`;
      });

      const q = `
        INSERT INTO availability_slots
          (doctor_id, specialization_id, start_time, end_time, duration_mins, source)
        VALUES ${tuples.join(", ")}
        ON CONFLICT (doctor_id, start_time) DO NOTHING
        RETURNING id
      `;
      const { rowCount } = await db.query(q, values);
      return rowCount ?? 0;
    },

    async search(params: {
      specializationId: string;
      fromIso: string; // ISO timestamptz
      toIso: string; // ISO timestamptz
      limit?: number;
      offset?: number;
    }): Promise<{
      items: AvailabilitySlotRow[];
      total: number;
      limit: number;
      offset: number;
    }> {
      const limit = Math.max(1, Math.min(params.limit ?? 20, 100));
      const offset = Math.max(0, params.offset ?? 0);

      const sqlItems = `
        SELECT id, doctor_id, specialization_id, start_time, end_time, duration_mins, is_booked, source, created_at
        FROM availability_slots
        WHERE specialization_id = $1
          AND is_booked = false
          AND start_time >= $2
          AND start_time <  $3
        ORDER BY start_time ASC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const sqlCount = `
        SELECT COUNT(*)::int AS count
        FROM availability_slots
        WHERE specialization_id = $1
          AND is_booked = false
          AND start_time >= $2
          AND start_time <  $3
      `;
      const [{ rows: items }, { rows: c }] = await Promise.all([
        db.query<AvailabilitySlotRow>(sqlItems, [
          params.specializationId,
          params.fromIso,
          params.toIso,
        ]),
        db.query<{ count: number }>(sqlCount, [
          params.specializationId,
          params.fromIso,
          params.toIso,
        ]),
      ]);

      return { items, total: c[0]?.count ?? 0, limit, offset };
    },

    async byId(id: string): Promise<AvailabilitySlotRow | null> {
      const { rows } = await db.query<AvailabilitySlotRow>(
        `SELECT * FROM availability_slots WHERE id = $1`,
        [id],
      );
      return rows[0] ?? null;
    },

    async lockForUpdate(
      client: Database["pool"],
      slotId: string,
    ): Promise<AvailabilitySlotRow | null> {
      const { rows } = await client.query<AvailabilitySlotRow>(
        `SELECT * FROM availability_slots WHERE id = $1 FOR UPDATE`,
        [slotId],
      );
      return rows[0] ?? null;
    },

    async markBooked(client: Database["pool"], slotId: string): Promise<void> {
      await client.query(`UPDATE availability_slots SET is_booked = true WHERE id = $1`, [slotId]);
    },

    async markFree(client: Database["pool"], slotId: string): Promise<void> {
      await client.query(`UPDATE availability_slots SET is_booked = false WHERE id = $1`, [slotId]);
    },
  };
}
