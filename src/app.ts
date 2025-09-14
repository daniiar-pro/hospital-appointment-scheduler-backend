import express from "express";
import cookieParser from "cookie-parser";
import { makeAuthRouter } from "./modules/auth/routes.js";
import { authenticate } from "./middleware/authenticate.js";
import { CONFIG } from "./config.js";

export function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.use("/auth", makeAuthRouter(CONFIG.JWT_SECRET));

  // Protected route example
  app.get("/profile", authenticate(CONFIG.JWT_SECRET), (req: any, res) => {
    res.json({ id: req.user.id, role: req.user.role });
  });

  app.get("/health", (_req, res) => res.json({ ok: true }));
  return app;
}
