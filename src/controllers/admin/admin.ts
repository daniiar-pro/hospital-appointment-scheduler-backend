import { Router } from "express";
import type { Database } from "../../database/index.js";
import { authenticate, authorizeRole } from "../../middleware/authenticate.js";
import { makeUsersService } from "../../services/admin/service.js";
import { makeSpecializationsService } from "../../services/specializations/service.js";
import { z } from "zod";

const listUsersQuery = z.object({
  role: z.enum(["patient", "doctor", "admin"]).optional(),
  q: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  order: z.enum(["created_desc", "created_asc"]).default("created_desc"),
});

const changeRoleBody = z.object({
  role: z.enum(["patient", "doctor", "admin"]),
});

const adminUpdateBody = z
  .object({
    username: z.string().min(1).max(50).optional(),
    email: z.string().email().max(254).optional(),
    role: z.enum(["patient", "doctor", "admin"]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Provide at least one field",
  });

export function makeAdminRouter(db: Database, jwtSecret: string) {
  const r = Router();
  const users = makeUsersService(db);
  const specs = makeSpecializationsService(db);

  r.use(authenticate(jwtSecret), authorizeRole("admin"));

  r.get("/users", async (req, res) => {
    const parsed = listUsersQuery.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }
    const data = await users.list(parsed.data);
    res.json(data); 
  });

  r.get("/users/:id", async (req, res) => {
    const u = await users.getPublic(req.params.id);
    if (!u) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(u);
  });

  r.patch("/users/:id/role", async (req, res) => {
    const parsed = changeRoleBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }
    const updated = await users.changeRole(req.params.id, parsed.data.role);
    if (!updated) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(updated);
  });

  r.patch("/users/:id", async (req, res) => {
    const parsed = adminUpdateBody.safeParse(req.body);
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
      const updated = await users.updateProfileAdmin(req.params.id, parsed.data);
      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(updated);
    } catch (e: any) {
      if (e.code === "23505") {
        return res.status(409).json({ error: "Email already in use" });
      }
      res.status(500).json({ error: "Internal error" });
    }
  });

  r.post("/users/:id/logout-all", async (req, res) => {
    const count = await users.logoutAllDevices(req.params.id);
    res.json({ revoked: count });
  });

  r.delete("/users/:id", async (req, res) => {
    const ok = await users.deleteUser(req.params.id);
    if (!ok) {
      return res.status(404).json({ error: "User not found or cannot delete" });
    }
    res.status(204).end();
  });

  r.get("/specializations", async (_req, res) => {
    const all = await specs.list();
    res.json(all);
  });

  r.post("/specializations", async (req, res) => {
    const parsed = z
      .object({
        name: z.string().min(2).max(120),
        description: z.string().max(500).optional(),
      })
      .safeParse(req.body);
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
      const s = await specs.create(parsed.data.name, parsed.data.description ?? null);
      res.status(201).json(s);
    } catch (e: any) {
      if (e.code === "23505") {
        return res.status(409).json({ error: "Specialization exists" });
      }
      res.status(500).json({ error: "Internal error" });
    }
  });

  r.patch("/specializations/:id", async (req, res) => {
    const parsed = z
      .object({
        name: z.string().min(2).max(120).optional(),
        description: z.string().max(500).optional(),
      })
      .refine((v) => Object.keys(v).length > 0, {
        message: "Provide at least one field",
      })
      .safeParse(req.body);

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
      const s = await specs.update(req.params.id, parsed.data);
      if (!s) {
        return res.status(404).json({ error: "Not found" });
      }
      res.json(s);
    } catch (e: any) {
      if (e.code === "23505") {
        return res.status(409).json({ error: "Specialization exists" });
      }
      res.status(500).json({ error: "Internal error" });
    }
  });

  r.delete("/specializations/:id", async (req, res) => {
    try {
      const ok = await specs.remove(req.params.id);
      if (!ok) {
        return res.status(404).json({ error: "Not found" });
      }
      res.status(204).end();
    } catch (e: any) {
      if (e.code === "23503") {
        return res.status(409).json({ error: "Specialization in use" });
      }
      res.status(500).json({ error: "Internal error" });
    }
  });

  return r;
}
