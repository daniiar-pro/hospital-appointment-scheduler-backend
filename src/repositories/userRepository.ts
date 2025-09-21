// src/repositories/users.repo.ts
import type { Database } from "../database/index.js";
import type { UserRow } from "../database/types.js";

// Keep repo independent from Zod DTOs.
// Define inputs that are persistence-friendly (e.g., require passwordHash).
export type CreateUserParams = {
  username: string;
  email: string;
  passwordHash: string;
  role?: "patient" | "doctor" | "admin"; // defaults to 'patient'
};

export type UpdateUserParams = Partial<{
  username: string;
  email: string;
  role: "patient" | "doctor" | "admin";
}>;

// Lightweight projection (no timestamps/no password)
export type UserPublicRow = Pick<UserRow, "id" | "username" | "email" | "role">;

export function userRepository(db: Database) {
  return {
    /** Insert and return full row (includes password_hash, timestamps). */
    async createUser(params: CreateUserParams): Promise<UserRow> {
      const { username, email, passwordHash, role = "patient" } = params;
      const q = `
        INSERT INTO users (username, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, username, email, password_hash, role, token_version, created_at, updated_at
      `;
      try {
        const { rows } = await db.query<UserRow>(q, [
          username,
          email,
          passwordHash,
          role,
        ]);
        return rows[0];
      } catch (e: any) {
        if (e.code === "23505") throw new Error("EMAIL_TAKEN"); // unique violation on email
        throw e;
      }
    },

    /** For login: need password_hash. */
    async findAuthByEmail(email: string): Promise<UserRow | null> {
      const q = `
        SELECT id, username, email, password_hash, role, token_version, created_at, updated_at
        FROM users
        WHERE email = $1
      `;
      const { rows } = await db.query<UserRow>(q, [email]);
      return rows[0] ?? null;
    },

    async findAuthById(id: string): Promise<UserRow | null> {
      const q = `
        SELECT id, username, email, password_hash, role, token_version, created_at, updated_at
        FROM users
        WHERE id = $1
      `;
      const { rows } = await db.query<UserRow>(q, [id]);
      return rows[0] ?? null;
    },

    /** Public projection (no password/timestamps). */
    async getPublicByEmail(email: string): Promise<UserPublicRow | null> {
      const q = `SELECT id, username, email, role FROM users WHERE email = $1`;
      const { rows } = await db.query<UserPublicRow>(q, [email]);
      return rows[0] ?? null;
    },

    async getPublicById(id: string): Promise<UserPublicRow | null> {
      const q = `SELECT id, username, email, role FROM users WHERE id = $1`;
      const { rows } = await db.query<UserPublicRow>(q, [id]);
      return rows[0] ?? null;
    },

    /** Quick existence check. */
    async existsByEmail(email: string): Promise<boolean> {
      const q = `SELECT 1 FROM users WHERE email = $1 LIMIT 1`;
      const { rowCount } = await db.query(q, [email]);

      return rowCount ? true : false;
    },

    /** List with filters + pagination. Returns items + total for UI pagination. */
    async listPublicUsers(opts?: {
      role?: "patient" | "doctor" | "admin";
      q?: string; // search by username or email (ILIKE)
      limit?: number; // default 20
      offset?: number; // default 0
      order?: "created_desc" | "created_asc";
    }): Promise<{
      items: UserPublicRow[];
      total: number;
      limit: number;
      offset: number;
    }> {
      const role = opts?.role;
      const qText = opts?.q?.trim();
      const limit = Math.max(1, Math.min(opts?.limit ?? 20, 100));
      const offset = Math.max(0, opts?.offset ?? 0);
      const order = opts?.order ?? "created_desc";

      const where: string[] = [];
      const params: any[] = [];
      let p = 1;

      if (role) {
        where.push(`role = $${p++}`);
        params.push(role);
      }
      if (qText) {
        where.push(`(username ILIKE $${p} OR email ILIKE $${p})`);
        params.push(`%${qText}%`);
        p++;
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const orderSql =
        order === "created_asc"
          ? "ORDER BY created_at ASC"
          : "ORDER BY created_at DESC";

      const sqlItems = `
        SELECT id, username, email, role
        FROM users
        ${whereSql}
        ${orderSql}
        LIMIT ${limit} OFFSET ${offset}
      `;
      const sqlCount = `
        SELECT COUNT(*)::int AS count
        FROM users
        ${whereSql}
      `;

      const [{ rows: items }, { rows: countRows }] = await Promise.all([
        db.query<UserPublicRow>(sqlItems, params),
        db.query<{ count: number }>(sqlCount, params),
      ]);

      return { items, total: countRows[0]?.count ?? 0, limit, offset };
    },

    /** Partial update. Only updates provided fields. Returns full row. */
    async updateUser(
      id: string,
      patch: UpdateUserParams
    ): Promise<UserRow | null> {
      const sets: string[] = [];
      const values: any[] = [];
      let i = 1;

      if (patch.username !== undefined) {
        sets.push(`username = $${i++}`);
        values.push(patch.username);
      }
      if (patch.email !== undefined) {
        sets.push(`email = $${i++}`);
        values.push(patch.email);
      }
      if (patch.role !== undefined) {
        sets.push(`role = $${i++}`);
        values.push(patch.role);
      }

      if (sets.length === 0) return await this.findAuthById(id); // nothing to change

      // Always bump updated_at
      sets.push(`updated_at = now()`);

      const q = `
        UPDATE users
        SET ${sets.join(", ")}
        WHERE id = $${i}
        RETURNING id, username, email, password_hash, role, token_version, created_at, updated_at
      `;
      values.push(id);

      try {
        const { rows } = await db.query<UserRow>(q, values);
        return rows[0] ?? null;
      } catch (e: any) {
        if (e.code === "23505") throw new Error("EMAIL_TAKEN"); // email unique violation
        throw e;
      }
    },

    /** Change password: update hash & bump token_version to invalidate old access tokens. */
    async updatePasswordHash(
      id: string,
      newHash: string
    ): Promise<UserRow | null> {
      const q = `
        UPDATE users
        SET password_hash = $2,
            token_version = token_version + 1,
            updated_at = now()
        WHERE id = $1
        RETURNING id, username, email, password_hash, role, token_version, created_at, updated_at
      `;
      const { rows } = await db.query<UserRow>(q, [id, newHash]);
      return rows[0] ?? null;
    },

    /** Force-invalidate all access tokens for a user (e.g., admin action). */
    async incrementTokenVersion(id: string): Promise<UserRow | null> {
      const q = `
        UPDATE users
        SET token_version = token_version + 1,
            updated_at = now()
        WHERE id = $1
        RETURNING id, username, email, password_hash, role, token_version, created_at, updated_at
      `;
      const { rows } = await db.query<UserRow>(q, [id]);
      return rows[0] ?? null;
    },

    /** Delete user. Returns true if a row was deleted. */
    async deleteUser(id: string): Promise<boolean> {
      const q = `DELETE FROM users WHERE id = $1`;
      const { rowCount } = await db.query(q, [id]);
      return rowCount ? true : false;
    },

    /** Batch fetch helper (projection). Useful for joins in services. */
    async findManyPublicByIds(ids: string[]): Promise<UserPublicRow[]> {
      if (!ids.length) return [];
      const q = `
        SELECT id, username, email, role
        FROM users
        WHERE id = ANY($1::uuid[])
      `;
      const { rows } = await db.query<UserPublicRow>(q, [ids]);
      return rows;
    },
  };
}
