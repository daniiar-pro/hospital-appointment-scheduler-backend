import path from "node:path";
import crypto from "node:crypto";
import { readJson, writeJsonAtomic } from "../../utils/filedb.js";

export type Role = "doctor" | "patient";
export type User = {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
};
type Store = { users: User[] };

const FILE = path.resolve("data/users.json");

export async function findByEmail(email: string): Promise<User | null> {
  const db = await readJson<Store>(FILE, { users: [] });
  return (
    db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null
  );
}
export async function findById(id: string): Promise<User | null> {
  const db = await readJson<Store>(FILE, { users: [] });
  return db.users.find((u) => u.id === id) ?? null;
}
export async function createUser(
  email: string,
  passwordHash: string,
  role: Role
): Promise<User> {
  const db = await readJson<Store>(FILE, { users: [] });
  if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase()))
    throw new Error("EMAIL_EXISTS");
  const user: User = {
    id: crypto.randomUUID(),
    email,
    passwordHash,
    role,
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  await writeJsonAtomic(FILE, db);
  return user;
}
