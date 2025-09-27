import express from "express";
import cookieParser from "cookie-parser";
import { config } from "./config.js";
import type { Database } from "./database/index.js";
import { makeAuthRouter } from "./controllers/auth/auth.js";
import { makeAdminRouter } from "./controllers/admin/admin.js";
import { makeDoctorMeRouter } from "./controllers/doctor/doctor.js";
import { makePublicSpecializationsRouter } from "./controllers/specializations/specializations.js";
import { makePatientAppointmentsRouter } from "./controllers/patient/patient.js";

export function buildApp(db: Database) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.use("/auth", makeAuthRouter(db, config.JWT_SECRET));
  app.use("/admin", makeAdminRouter(db, config.JWT_SECRET));
  app.use("/specializations", makePublicSpecializationsRouter(db));
  app.use("/doctors/me", makeDoctorMeRouter(db, config.JWT_SECRET));
  app.use("/patients/me", makePatientAppointmentsRouter(db, config.JWT_SECRET));

  app.get("/health", (_req, res) => res.json({ ok: true }));
  return app;
}
