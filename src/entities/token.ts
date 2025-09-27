import { z } from "zod";
import type { RefreshTokenRow } from "../database/types.js";

export const refreshTokenRowSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  expiresAt: z.iso.datetime({ offset: true }),
  revokedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  createdAt: z.iso.datetime({ offset: true }),
  userAgent: z.string().max(400).nullable().optional(),
  ip: z.string().max(100).nullable().optional(),
});
export type RefreshToken = z.infer<typeof refreshTokenRowSchema>;

export function mapRefreshTokenRow(row: RefreshTokenRow): RefreshToken {
  return {
    id: row.id,
    userId: row.user_id,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at ?? null,
    createdAt: row.created_at,
    userAgent: row.user_agent ?? null,
    ip: row.ip ?? null,
  };
}
