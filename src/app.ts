import express from "express";
import cookieParser from "cookie-parser";
import { authenticate } from "./middleware/authenticate.js";
import { config } from "./config.js";
import type { Database } from "./database/index.js";
import { makeAuthRouter } from "./controllers/auth/routes.js";

export function buildApp(db: Database) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.use("/auth", makeAuthRouter(db, config.JWT_SECRET));

  app.get("/health", (_req, res) => res.json({ ok: true }));
  return app;
}
