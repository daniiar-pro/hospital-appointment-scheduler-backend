import type { Database } from "../../database/index.js";
import { availabilitySlotsRepository } from "../../repositories/availabilitySlotsRepository.js";
import { appointmentsRepository } from "../../repositories/appointmentsRepository.js";

export function makeAppointmentsService(db: Database) {
  const slots = availabilitySlotsRepository(db);
  const appts = appointmentsRepository(db);

  return {
    async searchSlots(params: {
      specializationId: string;
      fromIso: string;
      toIso: string;
      limit?: number;
      offset?: number;
    }) {
      return slots.search(params);
    },

    async bookSlot(slotId: string, patientId: string, symptoms: string | null) {
      const appt = await appts.bookSlotAtomic(slotId, patientId, symptoms); 
      if (!appt) {
        return { ok: false as const, code: "ALREADY_BOOKED" };
      } 
      return { ok: true as const, appointment: appt };
    },

    async cancelAppointment(appointmentId: string, patientId: string) {
      const ok = await appts.cancelAtomic(appointmentId, patientId); 
      if (!ok) {
        return { ok: false as const, code: "NOT_FOUND" };
      }
      return { ok: true as const };
    },

    listMyAppointments: (patientId: string, fromIso?: string, toIso?: string) =>
      appts.listForPatient(patientId, fromIso, toIso),
  };
}
