import type { Database } from "../../database";
import { userRepository } from "../../repositories/userRepository.js";
import { doctorSpecializationsRepository } from "../../repositories/doctorSpecializationsRepository.js";
import { weeklyAvailabilityRepository } from "../../repositories/weeklyAvailabilityRepository.js";
import { slotExceptionsRepository } from "../../repositories/slotExceptionsRepository.js";

export function makeDoctorsService(db: Database) {
  const users = userRepository(db);
  const docSpecs = doctorSpecializationsRepository(db);
  const weekly = weeklyAvailabilityRepository(db);
  const slotsEx = slotExceptionsRepository(db);

  return {
    async getMyProfile(id: string) {
      return users.getPublicById(id);
    },
    async updateMyProfile(id: string, patch: { username?: string; email?: string }) {
      const updated = await users.updateUser(id, patch);
      return updated
        ? {
            id: updated.id,
            username: updated.username,
            email: updated.email,
            role: updated.role,
          }
        : null;
    },

    listMySpecializations(doctorId: string) {
      return docSpecs.listForDoctor(doctorId);
    },
    replaceMySpecializations(doctorId: string, specIds: string[]) {
      return docSpecs.replaceAll(doctorId, specIds);
    },
    removeMySpecialization(doctorId: string, specId: string) {
      return docSpecs.removeOne(doctorId, specId);
    },

    listMyWeeklyAvailability(doctorId: string) {
      return weekly.list(doctorId);
    },
    upsertMyWeeklyAvailability(
      doctorId: string,
      rows: Array<{
        weekday: number;
        start_time: string;
        end_time: string;
        slot_duration_mins: number;
        timezone: string;
      }>,
    ) {
      return weekly.upsert(doctorId, rows);
    },

    listMySlotExceptions(doctorId: string) {
      return slotsEx.list(doctorId);
    },
    createMySlotException(
      doctorId: string,
      data: {
        day: string;
        full_day: boolean;
        start_time?: string | null;
        end_time?: string | null;
        reason?: string | null;
      },
    ) {
      return slotsEx.create(doctorId, data);
    },
    removeMySlotException(doctorId: string, id: string) {
      return slotsEx.remove(id, doctorId);
    },
  };
}
