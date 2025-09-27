import type { Database } from "../database/index.js";
import type { AppointmentRow } from "../database/types.js";

export function appointmentsRepository(db: Database) {
  return {
    async bookSlotAtomic(
      slotId: string,
      patientId: string,
      symptoms: string | null,
    ): Promise<AppointmentRow | null> {
      const q = `
        WITH reserved AS (
          UPDATE availability_slots
             SET is_booked = true
           WHERE id = $1
             AND is_booked = false
          RETURNING id
        ), ins AS (
          INSERT INTO appointments (availability_slot_id, patient_id, status, symptoms, booked_at)
          SELECT id, $2, 'confirmed', $3, now()
            FROM reserved
          RETURNING id, availability_slot_id, patient_id, status, symptoms, notes, booked_at, canceled_at
        )
        SELECT * FROM ins
      `;
      const { rows } = await db.query<AppointmentRow>(q, [slotId, patientId, symptoms]);
      return rows[0] ?? null;
    },

    async cancelAtomic(appointmentId: string, patientId: string): Promise<boolean> {
      const q = `
        WITH appt AS (
          UPDATE appointments
             SET status = 'canceled', canceled_at = now()
           WHERE id = $1
             AND patient_id = $2
             AND status IN ('pending','confirmed')
          RETURNING availability_slot_id
        ), freed AS (
          UPDATE availability_slots
             SET is_booked = false
           WHERE id = (SELECT availability_slot_id FROM appt)
          RETURNING id
        )
        SELECT (SELECT count(*) FROM appt)::int AS appt_count
      `;
      const { rows } = await db.query<{ appt_count: number }>(q, [appointmentId, patientId]);
      return (rows[0]?.appt_count ?? 0) > 0;
    },

    async byIdForPatient(id: string, patientId: string): Promise<AppointmentRow | null> {
      const q = `
        SELECT * FROM appointments
        WHERE id = $1 AND patient_id = $2
      `;
      const { rows } = await db.query<AppointmentRow>(q, [id, patientId]);
      return rows[0] ?? null;
    },

    async listForPatient(patientId: string, fromIso?: string, toIso?: string) {
      const where: string[] = [`a.patient_id = $1`];
      const params: any[] = [patientId];
      let i = 2;
      if (fromIso) {
        where.push(`s.start_time >= $${i++}`);
        params.push(fromIso);
      }
      if (toIso) {
        where.push(`s.start_time <  $${i++}`);
        params.push(toIso);
      }

      const q = `
        SELECT a.*, s.start_time, s.end_time, s.doctor_id, s.specialization_id
        FROM appointments a
        JOIN availability_slots s ON s.id = a.availability_slot_id
        WHERE ${where.join(" AND ")}
        ORDER BY s.start_time ASC
      `;
      const { rows } = await db.query(q, params);
      return rows;
    },

    async listForDoctor(doctorId: string, fromIso?: string, toIso?: string) {
      const where: string[] = [`s.doctor_id = $1`];
      const params: any[] = [doctorId];
      let i = 2;
      if (fromIso) {
        where.push(`s.start_time >= $${i++}`);
        params.push(fromIso);
      }
      if (toIso) {
        where.push(`s.start_time <  $${i++}`);
        params.push(toIso);
      }

      const q = `
        SELECT a.*, s.start_time, s.end_time, s.specialization_id
        FROM appointments a
        JOIN availability_slots s ON s.id = a.availability_slot_id
        WHERE ${where.join(" AND ")}
        ORDER BY s.start_time ASC
      `;
      const { rows } = await db.query(q, params);
      return rows;
    },
  };
}
