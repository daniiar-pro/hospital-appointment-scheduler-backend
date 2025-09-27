import { z } from "zod";
import type { SpecializationRow } from "../database/types.js";

export const specializationSchema = z.object({
  id: z.uuid(),
  name: z.string().min(2).max(120),
  description: z.string().max(500).nullable().optional(),
});
export type Specialization = z.infer<typeof specializationSchema>;

export function mapSpecializationRow(row: SpecializationRow): Specialization {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
  };
}

export const createSpecializationDto = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).nullish(), 
});

export const updateSpecializationDto = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).nullish(), 
});
