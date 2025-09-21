// src/repositories/refreshTokens.repo.ts
import crypto from "node:crypto";
import type { Database } from "../database/index.js";
import type { RefreshTokenRow } from "../database/types.js";

function sha256(input: string | Buffer) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/** Generate a new opaque refresh token (plaintext for the client/cookie). */
export function newOpaqueToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export type InsertMeta = {
  userAgent?: string | null;
  ip?: string | null;
};

export function refreshTokenRepository(db: Database) {
  return {
    /**
     * Store a refresh token (hashed) for a user. Returns the stored row.
     * TTL is in days (e.g., 30). Metadata is optional (user agent, ip).
     */
    async insert(
      userId: string,
      plaintextToken: string,
      ttlDays: number,
      meta: InsertMeta = {}
    ): Promise<RefreshTokenRow> {
      const tokenHash = sha256(plaintextToken);

      const q = `
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
        VALUES ($1, $2, now() + ($3 || ' days')::interval, $4, $5)
        RETURNING id, user_id, token_hash, expires_at, revoked_at, created_at, user_agent, ip_address
      `;

      const { rows } = await db.query<RefreshTokenRow>(q, [
        userId,
        tokenHash,
        ttlDays,
        meta.userAgent ?? null,
        meta.ip ?? null,
      ]);

      return rows[0];
    },

    /**
     * Find a VALID (not revoked, not expired) token by plaintext.
     * Returns minimal identifying info for follow-up (e.g., rotation).
     */
    async findValid(
      plaintextToken: string
    ): Promise<Pick<RefreshTokenRow, "id" | "user_id"> | null> {
      const tokenHash = sha256(plaintextToken);

      const q = `
        SELECT id, user_id
        FROM refresh_tokens
        WHERE token_hash = $1
          AND revoked_at IS NULL
          AND expires_at > now()
        LIMIT 1
      `;

      const { rows } = await db.query<Pick<RefreshTokenRow, "id" | "user_id">>(
        q,
        [tokenHash]
      );
      return rows[0] ?? null;
    },

    /** Revoke a single token by plaintext (idempotent). */
    async revoke(plaintextToken: string): Promise<void> {
      const tokenHash = sha256(plaintextToken);
      const q = `UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL`;
      await db.query(q, [tokenHash]);
    },

    /** Revoke a token by ID (useful when you already have it). */
    async revokeById(id: string): Promise<void> {
      const q = `UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`;
      await db.query(q, [id]);
    },

    /** Revoke ALL active tokens for a user (logout all devices). */
    async revokeAllForUser(userId: string): Promise<number> {
      const q = `
        UPDATE refresh_tokens
        SET revoked_at = now()
        WHERE user_id = $1 AND revoked_at IS NULL
      `;
      const { rowCount } = await db.query(q, [userId]);
      return rowCount ?? 0;
    },

    /** Optional: list tokens for a user (for admin UI or debugging). */
    async listForUser(
      userId: string,
      opts?: { includeRevoked?: boolean }
    ): Promise<RefreshTokenRow[]> {
      const includeRevoked = !!opts?.includeRevoked;
      const q = `
        SELECT id, user_id, token_hash, expires_at, revoked_at, created_at, user_agent, ip
        FROM refresh_tokens
        WHERE user_id = $1
          ${includeRevoked ? "" : "AND revoked_at IS NULL"}
        ORDER BY created_at DESC
      `;
      const { rows } = await db.query<RefreshTokenRow>(q, [userId]);
      return rows;
    },

    /** Optional: purge expired+revoked tokens to keep table tidy. */
    async purgeStale(): Promise<number> {
      const q = `
        DELETE FROM refresh_tokens
        WHERE expires_at <= now() OR revoked_at IS NOT NULL
      `;
      const { rowCount } = await db.query(q);
      return rowCount ?? 0;
    },

    /**
     * Optional: enforce max active sessions per user.
     * Keeps newest N active tokens, revokes older ones.
     */
    async enforceMaxActiveForUser(
      userId: string,
      keepLatest = 5
    ): Promise<number> {
      const q = `
        WITH ranked AS (
          SELECT id,
                 ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
          FROM refresh_tokens
          WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > now()
        )
        UPDATE refresh_tokens t
        SET revoked_at = now()
        FROM ranked r
        WHERE t.id = r.id AND r.rn > $2
      `;
      const { rowCount } = await db.query(q, [userId, keepLatest]);
      return rowCount ?? 0;
    },
  };
}
