import type { Database } from "../database/index.js";
import type { DoctorSpecializationRow } from "../database/types.js";

export function doctorSpecializationsRepository(db: Database) {
  return {
    async listForDoctor(doctorId: string) {
      const q = `
        SELECT ds.id, ds.doctor_id, ds.specialization_id, ds.created_at,
               s.name, s.description
        FROM doctor_specializations ds
        JOIN specializations s ON s.id = ds.specialization_id
        WHERE ds.doctor_id = $1
        ORDER BY s.name ASC
      `;
      return db.query<any>(q, [doctorId]).then((r) => r.rows);
    },

    async upsertMany(doctorId: string, specializationIds: string[]) {
      if (!specializationIds.length) {
        return [];
      }
      const q = `
        INSERT INTO doctor_specializations (doctor_id, specialization_id)
        SELECT $1, UNNEST($2::uuid[])
        ON CONFLICT (doctor_id, specialization_id) DO NOTHING
        RETURNING id, doctor_id, specialization_id, created_at
      `;
      const { rows } = await db.query<DoctorSpecializationRow>(q, [doctorId, specializationIds]);
      return rows;
    },

    async replaceAll(doctorId: string, specializationIds: string[]) {
      await db.query(`DELETE FROM doctor_specializations WHERE doctor_id = $1`, [doctorId]);
      return this.upsertMany(doctorId, specializationIds);
    },

    async removeOne(doctorId: string, specId: string) {
      const { rowCount } = await db.query(
        `DELETE FROM doctor_specializations WHERE doctor_id = $1 AND specialization_id = $2`,
        [doctorId, specId],
      );
      return rowCount ? true : false;
    },
  };
}
