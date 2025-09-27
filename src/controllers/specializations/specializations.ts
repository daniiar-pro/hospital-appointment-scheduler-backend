import { Router } from "express";
import type { Database } from "../../database";
import { makeSpecializationsService } from "../../services/specializations/service.js";

export function makePublicSpecializationsRouter(db: Database) {
  const router = Router();

  const specsService = makeSpecializationsService(db);

  router.get("/", async (_req, res) => {
    const allSpecs = await specsService.list();
    res.json(allSpecs);
  });

  return router;
}
