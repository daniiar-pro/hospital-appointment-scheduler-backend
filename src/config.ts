import "dotenv/config";

const { env } = process;

const toInt = (v: string | undefined, fallback: number) => {
  return v !== undefined && !Number.isNaN(Number(v)) ? Number(v) : fallback;
};

export const CONFIG = {
  NODE_ENV: env.NODE_ENV ?? "development",
  PORT: toInt(env.PORT, 3000),

  //Auth
  JWT_SECRET: env.JWT_SECRET ?? "dev-secret-change-me",
  ACCESS_TTL_SECONDS: toInt(env.ACCESS_TTL_SECONDS, 15 * 60),
  REFRESH_TTL_DAYS: toInt(env.REFRESH_TTL_DAYS, 30),
} as const;
