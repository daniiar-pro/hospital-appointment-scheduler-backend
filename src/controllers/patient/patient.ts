import { Router } from "express";
import type { Database } from "../../database/index.js";
import { authenticate, authorizeRole } from "../../middleware/authenticate.js";
import { makeAppointmentsService } from "../../services/appointments/service.js";
import { z } from "zod";

const searchQuery = z.object({
  specializationId: z.string().uuid(),
  from: z.string().datetime(),
  to: z.string().datetime(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const bookBody = z.object({
  slotId: z.string().uuid(),
  symptoms: z.string().max(2000).optional(),
});

export function makePatientAppointmentsRouter(db: Database, jwtSecret: string) {
  const r = Router();
  const svc = makeAppointmentsService(db);

  r.use(authenticate(jwtSecret), authorizeRole("patient"));

  // GET /patients/me/slots/search
  r.get("/slots/search", async (req, res) => {
    const parsed = searchQuery.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
    }
    const { specializationId, from, to, limit, offset } = parsed.data;
    const data = await svc.searchSlots({
      specializationId,
      fromIso: from,
      toIso: to,
      limit,
      offset,
    });
    res.json(data);
  });

  // POST /patients/me/appointments
  r.post("/appointments", async (req: any, res) => {
    const parsed = bookBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
    }
    const result = await svc.bookSlot(
      parsed.data.slotId,
      req.user.id,
      parsed.data.symptoms ?? null,
    );
    if (!result.ok) {
      if (result.code === "NOT_FOUND") {
        return res.status(404).json({ error: "Slot not found" });
      }
      if (result.code === "ALREADY_BOOKED") {
        return res.status(409).json({ error: "Slot already booked" });
      }
      return res.status(400).json({ error: "Cannot book" });
    }
    res.status(201).json(result.appointment);
  });

  // GET /patients/me/appointments
  r.get("/appointments", async (req: any, res) => {
    const fromIso = typeof req.query.from === "string" ? req.query.from : undefined;
    const toIso = typeof req.query.to === "string" ? req.query.to : undefined;
    const items = await svc.listMyAppointments(req.user.id, fromIso, toIso);
    res.json(items);
  });

  // PATCH /patients/me/appointments/:id/cancel
  r.patch("/appointments/:id/cancel", async (req: any, res) => {
    const result = await svc.cancelAppointment(req.params.id, req.user.id);
    if (!result.ok) {
      if (result.code === "NOT_FOUND") {
        return res.status(404).json({ error: "Appointment not found" });
      }
      if (result.code === "ALREADY_CANCELLED") {
        return res.status(409).json({ error: "Already cancelled" });
      }
      return res.status(400).json({ error: "Cannot cancel" });
    }
    res.status(204).end();
  });

  return r;
}
