import { z } from "zod";
import type { DoctorSpecializationRow } from "../database/types.js";

export const doctorSpecializationSchema = z.object({
  id: z.uuid(),
  doctorId: z.uuid(),
  specializationId: z.uuid(),
  createdAt: z.iso.datetime({ offset: true }),
});
export type DoctorSpecialization = z.infer<typeof doctorSpecializationSchema>;

export function mapDoctorSpecializationRow(
  row: DoctorSpecializationRow
): DoctorSpecialization {
  return {
    id: row.id,
    doctorId: row.doctor_id,
    specializationId: row.specialization_id,
    createdAt: row.created_at,
  };
}


// create a doc-spec link
export const linkDoctorSpecializationDto = z.object({
  doctorId: z.uuid(),
  specializationId: z.uuid(),
});

// remove a link (by its id)
export const unlinkDoctorSpecializationDto = z.object({
  id: z.uuid(),
});

// list a doctor's specializations
export const listDoctorSpecializationsDto = z.object({
  doctorId: z.uuid(),
});