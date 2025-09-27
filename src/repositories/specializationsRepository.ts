import type { Database } from "../database/index.js";
import type { SpecializationRow } from "../database/types.js";

export function specializationsRepository(db: Database) {
  return {
    async listAll(): Promise<SpecializationRow[]> {
      return db
        .query<SpecializationRow>(
          `SELECT id, name, description FROM specializations ORDER BY name ASC`,
        )
        .then((r) => r.rows);
    },
    async create(name: string, description: string | null): Promise<SpecializationRow> {
      const q = `
        INSERT INTO specializations (name, description)
        VALUES ($1, $2)
        RETURNING id, name, description
      `;
      const { rows } = await db.query<SpecializationRow>(q, [name, description]);
      return rows[0];
    },
    async update(
      id: string,
      patch: { name?: string; description?: string },
    ): Promise<SpecializationRow | null> {
      const sets: string[] = [];
      const vals: any[] = [];
      let i = 1;
      if (patch.name !== undefined) {
        sets.push(`name = $${i++}`);
        vals.push(patch.name);
      }
      if (patch.description !== undefined) {
        sets.push(`description = $${i++}`);
        vals.push(patch.description);
      }
      if (!sets.length) {
        return this.findById(id);
      }
      const q = `UPDATE specializations SET ${sets.join(", ")} WHERE id = $${i} RETURNING id, name, description`;
      vals.push(id);
      const { rows } = await db.query<SpecializationRow>(q, vals);
      return rows[0] ?? null;
    },
    async remove(id: string): Promise<boolean> {
      const { rowCount } = await db.query(`DELETE FROM specializations WHERE id = $1`, [id]);
      return rowCount ? true : false;
    },
    async findById(id: string): Promise<SpecializationRow | null> {
      const { rows } = await db.query<SpecializationRow>(
        `SELECT id, name, description FROM specializations WHERE id = $1`,
        [id],
      );
      return rows[0] ?? null;
    },
  };
}
