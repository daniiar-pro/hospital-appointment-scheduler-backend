import path from "node:path";
import crypto from "node:crypto";
import { readJson, writeJsonAtomic } from "../../utils/filedb.js";

type TokenRow = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
};
type Store = { tokens: TokenRow[] };

const FILE = path.resolve("data/refreshTokens.json");
const sha256 = (s: string) =>
  crypto.createHash("sha256").update(s).digest("hex");

export function newOpaqueToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export async function insertRefreshToken(
  userId: string,
  token: string,
  days: number
): Promise<void> {
  const db = await readJson<Store>(FILE, { tokens: [] });
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  db.tokens.push({
    id: crypto.randomUUID(),
    userId,
    tokenHash: sha256(token),
    expiresAt: expires.toISOString(),
    revokedAt: null,
    createdAt: new Date().toISOString(),
  });
  await writeJsonAtomic(FILE, db);
}

export async function findValidToken(
  token: string
): Promise<{ userId: string } | null> {
  const db = await readJson<Store>(FILE, { tokens: [] });
  const rec = db.tokens.find(
    (t) => t.tokenHash === sha256(token) && !t.revokedAt
  );
  if (!rec) return null;
  if (new Date(rec.expiresAt) < new Date()) return null;
  return { userId: rec.userId };
}

export async function revokeToken(token: string): Promise<void> {
  const db = await readJson<Store>(FILE, { tokens: [] });
  const rec = db.tokens.find(
    (t) => t.tokenHash === sha256(token) && !t.revokedAt
  );
  if (!rec) return;
  rec.revokedAt = new Date().toISOString();
  await writeJsonAtomic(FILE, db);
}
