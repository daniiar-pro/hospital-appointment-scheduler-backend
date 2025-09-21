import crypto from "node:crypto";

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const N = 16384, r = 8, p = 1, keyLen = 32;
  const key: Buffer = await new Promise((res, rej) =>
    crypto.scrypt(password, salt, keyLen, { N, r, p }, (e, dk) => e ? rej(e) : res(dk as Buffer))
  );
  return `scrypt:${salt.toString("hex")}:${key.toString("hex")}:${N}:${r}:${p}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [tag, saltHex, keyHex, Nstr, rstr, pstr] = stored.split(":");
  if (tag !== "scrypt") return false;
  const salt = Buffer.from(saltHex, "hex");
  const key = Buffer.from(keyHex, "hex");
  const N = +Nstr, r = +rstr, p = +pstr;
  const cand: Buffer = await new Promise((res, rej) =>
    crypto.scrypt(password, salt, key.length, { N, r, p }, (e, dk) => e ? rej(e) : res(dk as Buffer))
  );
  try { return crypto.timingSafeEqual(cand, key); } catch { return false; }
}