

import type { Database } from "../../database/index.js";

const mockSlotsRepo = {
  search: jest.fn(),
};
jest.mock("../../repositories/availabilitySlotsRepository.js", () => ({
  availabilitySlotsRepository: jest.fn(() => mockSlotsRepo),
}));

const mockApptsRepo = {
  bookSlotAtomic: jest.fn(),
  cancelAtomic: jest.fn(),
  listForPatient: jest.fn(),
};
jest.mock("../../repositories/appointmentsRepository.js", () => ({
  appointmentsRepository: jest.fn(() => mockApptsRepo),
}));

import { makeAppointmentsService } from "./service.js";

function makeDb(): Database {
  return { query: jest.fn(), pool: {} as any, close: jest.fn() } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("services/appointments", () => {
  describe("searchSlots", () => {
    it("forwards params to slots.search and returns the result", async () => {
      const db = makeDb();
      const svc = makeAppointmentsService(db);

      const params = {
        specializationId: "spec-1",
        fromIso: "2026-01-01T00:00:00.000Z",
        toIso: "2026-01-15T00:00:00.000Z",
        limit: 10,
        offset: 0,
      };
      const expected = { items: [{ id: "slot1" }], total: 1, limit: 10, offset: 0 };
      mockSlotsRepo.search.mockResolvedValueOnce(expected);

      const out = await svc.searchSlots(params);
      expect(out).toBe(expected);
      expect(mockSlotsRepo.search).toHaveBeenCalledWith(params);
    });
  });

  describe("bookSlot", () => {
    it("returns ok=true when atomic insert succeeds", async () => {
      const db = makeDb();
      const svc = makeAppointmentsService(db);

      const apptRow = {
        id: "appt-1",
        availability_slot_id: "slot-1",
        patient_id: "pat-1",
        status: "confirmed",
        symptoms: "headache",
        notes: null,
        booked_at: "2026-01-01T10:00:00.000Z",
        canceled_at: null,
      };
      mockApptsRepo.bookSlotAtomic.mockResolvedValueOnce(apptRow);

      const out = await svc.bookSlot("slot-1", "pat-1", "headache");
      expect(out).toEqual({ ok: true, appointment: apptRow });
      expect(mockApptsRepo.bookSlotAtomic).toHaveBeenCalledWith("slot-1", "pat-1", "headache");
    });

    it("returns ok=false, code=ALREADY_BOOKED when atomic insert fails (null)", async () => {
      const db = makeDb();
      const svc = makeAppointmentsService(db);

      mockApptsRepo.bookSlotAtomic.mockResolvedValueOnce(null);
      const out = await svc.bookSlot("slot-1", "pat-1", null);

      expect(out).toEqual({ ok: false, code: "ALREADY_BOOKED" });
    });
  });

  describe("cancelAppointment", () => {
    it("returns ok=true when cancel succeeds", async () => {
      const db = makeDb();
      const svc = makeAppointmentsService(db);

      mockApptsRepo.cancelAtomic.mockResolvedValueOnce(true);
      const out = await svc.cancelAppointment("appt-1", "pat-1");

      expect(out).toEqual({ ok: true });
      expect(mockApptsRepo.cancelAtomic).toHaveBeenCalledWith("appt-1", "pat-1");
    });

    it("returns ok=false, code=NOT_FOUND when cancel returns false", async () => {
      const db = makeDb();
      const svc = makeAppointmentsService(db);

      mockApptsRepo.cancelAtomic.mockResolvedValueOnce(false);
      const out = await svc.cancelAppointment("missing", "pat-1");

      expect(out).toEqual({ ok: false, code: "NOT_FOUND" });
    });
  });

  describe("listMyAppointments", () => {
    it("forwards to repo.listForPatient", async () => {
      const db = makeDb();
      const svc = makeAppointmentsService(db);

      const rows = [{ id: "appt-1" }];
      mockApptsRepo.listForPatient.mockResolvedValueOnce(rows);

      const out = await svc.listMyAppointments("pat-1", "2026-01-01", "2026-02-01");
      expect(out).toBe(rows);
      expect(mockApptsRepo.listForPatient).toHaveBeenCalledWith(
        "pat-1",
        "2026-01-01",
        "2026-02-01",
      );
    });
  });
});
