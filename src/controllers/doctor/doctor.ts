import { Router } from "express";
import type { Database } from "../../database/index.js";
import { authenticate, authorizeRole } from "../../middleware/authenticate.js";
import { makeDoctorsService } from "../../services/doctor/service.js";
import { makeSlotsService } from "../../services/slots/service.js";
import { appointmentsRepository } from "../../repositories/appointmentsRepository.js";
import { z } from "zod";

const profilePatch = z
  .object({
    username: z.string().min(1).max(50).optional(),
    email: z.string().email().max(254).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Provide at least one field",
  });

const specReplaceBody = z.object({
  specializationIds: z.array(z.string().uuid()).min(1),
});

const weeklyRow = z
  .object({
    weekday: z.coerce.number().int().min(0).max(6),
    start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    slot_duration_mins: z.coerce.number().int().min(5).max(480),
    timezone: z.string().min(1),
  })
  .refine((v) => v.start_time < v.end_time, {
    path: ["end_time"],
    message: "end_time must be > start_time",
  });

const weeklyReplaceBody = z.object({ items: z.array(weeklyRow).max(70) });

const exceptionBody = z
  .object({
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    full_day: z.boolean(),
    start_time: z
      .string()
      .regex(/^\d{2}:\d{2}(:\d{2})?$/)
      .nullable()
      .optional(),
    end_time: z
      .string()
      .regex(/^\d{2}:\d{2}(:\d{2})?$/)
      .nullable()
      .optional(),
    reason: z.string().max(300).nullable().optional(),
  })
  .refine(
    (v) =>
      v.full_day
        ? !v.start_time && !v.end_time
        : !!v.start_time && !!v.end_time && v.start_time < v.end_time,
    { message: "Provide start/end for partial; none for full_day" },
  );

const regenQuery = z.object({
  weeks: z.coerce.number().int().min(1).max(26).default(6),
  specializationId: z.uuid().optional(),
});

export function makeDoctorMeRouter(db: Database, jwtSecret: string) {
  const r = Router();
  const svc = makeDoctorsService(db);
  const slotsService = makeSlotsService(db);
  const appointmentRepo = appointmentsRepository(db);

  r.use(authenticate(jwtSecret), authorizeRole("doctor"));

  r.get("/profile", async (req: any, res) => {
    const me = await svc.getMyProfile(req.user.id);
    res.json(me);
  });

  r.get("/appointments", async (req: any, res) => {
    const fromIso = typeof req.query.from === "string" ? req.query.from : undefined;
    const toIso = typeof req.query.to === "string" ? req.query.to : undefined;
    const items = await appointmentRepo.listForDoctor(req.user.id, fromIso, toIso);
    res.json(items);
  });

  r.patch("/", async (req: any, res) => {
    const parsed = profilePatch.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
    }
    try {
      const updated = await svc.updateMyProfile(req.user.id, parsed.data);
      if (!updated) {
        return res.status(404).json({ error: "Not found" });
      }
      res.json(updated);
    } catch (e: any) {
      if (e.code === "23505") {
        return res.status(409).json({ error: "Email already in use" });
      }
      res.status(500).json({ error: "Internal error" });
    }
  });

  r.get("/specializations", async (req: any, res) => {
    const items = await svc.listMySpecializations(req.user.id);
    res.json(items);
  });

  r.put("/specializations", async (req: any, res) => {
    const parsed = specReplaceBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
    }
    const items = await svc.replaceMySpecializations(req.user.id, parsed.data.specializationIds);
    res.json({ assigned: items.length, items });
  });

  r.delete("/specializations/:specId", async (req: any, res) => {
    const ok = await svc.removeMySpecialization(req.user.id, req.params.specId);
    if (!ok) {
      return res.status(404).json({ error: "Pair not found" });
    }
    res.status(204).end();
  });

  r.get("/weekly-availability", async (req: any, res) => {
    const items = await svc.listMyWeeklyAvailability(req.user.id);
    res.json(items);
  });

  r.put("/weekly-availability", async (req: any, res) => {
    const parsed = weeklyReplaceBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }
    try {
      const items = await svc.upsertMyWeeklyAvailability(req.user.id, parsed.data.items);
      res.json({ saved: items.length, items });
    } catch (e: any) {
      return res.status(500).json({
        error: "Internal error",
        code: e.code ?? undefined,
        detail: e.detail ?? undefined,
      });
    }
  });

  r.get("/slot-exceptions", async (req: any, res) => {
    const items = await svc.listMySlotExceptions(req.user.id);
    res.json(items);
  });

  r.post("/slot-exceptions", async (req: any, res) => {
    const parsed = exceptionBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
    }
    const item = await svc.createMySlotException(req.user.id, parsed.data);
    res.status(201).json(item);
  });

  r.delete("/slot-exceptions/:id", async (req: any, res) => {
    const ok = await svc.removeMySlotException(req.user.id, req.params.id);
    if (!ok) {
      return res.status(404).json({ error: "Not found" });
    }
    res.status(204).end();
  });

  // POST /doctors/me/slots/regenerate?weeks=6&specializationId=...
  r.post("/slots/regenerate", async (req: any, res) => {
    const parsed = regenQuery.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
    }
    try {
      const { inserted } = await slotsService.regenerateForDoctor(
        req.user.id,
        parsed.data.weeks,
        parsed.data.specializationId,
      );
      res.json({ inserted });
    } catch (error: any) {
      if (error.message === "SPECIALIZATION_REQUIRED") {
        return res.status(400).json({
          error: "Doctor has multiple specialization; provide specializationId",
        });
      }

      res.status(500).json({ error: "Internal error" });
    }
  });

  return r;
}
