import "dotenv/config";
import { z } from "zod";

const Bool = z.preprocess(
  (v) => (typeof v === "string" ? v === "true" || v === "1" : v),
  z.boolean().default(false),
);

const Env = z
  .object({
    NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
    PORT: z.coerce.number().default(3000),
    CI: Bool,

    DATABASE_URL: z.string().url(), // postgres://user:pass@host:5432/dbname

    JWT_SECRET: z.string().min(1).default("dev-secret-change-me"),
    ACCESS_TTL_SECONDS: z.coerce.number().default(15 * 60),
    REFRESH_TTL_DAYS: z.coerce.number().default(30),
  })
  .readonly();

export const config = Env.parse(process.env);
