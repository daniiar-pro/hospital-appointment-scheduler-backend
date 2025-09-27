import express from "express";
import request from "supertest";

const mockApptSvc = {
  searchSlots: jest.fn(),
  bookSlot: jest.fn(),
  listMyAppointments: jest.fn(),
  cancelAppointment: jest.fn(),
};

jest.mock("../../services/appointments/service.js", () => ({
  makeAppointmentsService: () => mockApptSvc,
}));

jest.mock("../../middleware/authenticate.js", () => ({
  authenticate: () => (req: any, _res: any, next: any) => {
    req.user = { id: "pat-1", role: "patient" };
    next();
  },
  authorizeRole: () => (_req: any, _res: any, next: any) => next(),
}));

import { makePatientAppointmentsRouter } from "./patient.js";

function appFactory() {
  const app = express();
  app.use(express.json());
  app.use("/patients/me", makePatientAppointmentsRouter({} as any, "secret"));
  return app;
}

const FROM = "2026-01-01T00:00:00Z";
const TO = "2026-01-15T00:00:00Z";
const UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("Patient controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("GET /patients/me/slots/search (invalid) → 400", async () => {
    const app = appFactory();
    const res = await request(app)
      .get("/patients/me/slots/search")
      .query({ specializationId: "bad" });
    expect(res.status).toBe(400);
    expect(mockApptSvc.searchSlots).not.toHaveBeenCalled();
  });

  test("GET /patients/me/slots/search → 200", async () => {
    mockApptSvc.searchSlots.mockResolvedValueOnce({
      items: [{ id: "s1" }],
      total: 1,
      limit: 20,
      offset: 0,
    });
    const app = appFactory();
    const res = await request(app)
      .get("/patients/me/slots/search")
      .query({ specializationId: UUID, from: FROM, to: TO });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(mockApptSvc.searchSlots).toHaveBeenCalledWith({
      specializationId: UUID,
      fromIso: FROM,
      toIso: TO,
      limit: undefined,
      offset: undefined,
    });
  });

  test("POST /patients/me/appointments (invalid) → 400", async () => {
    const app = appFactory();
    const res = await request(app).post("/patients/me/appointments").send({ foo: "bar" });
    expect(res.status).toBe(400);
    expect(mockApptSvc.bookSlot).not.toHaveBeenCalled();
  });

  test("POST /patients/me/appointments → 404 NOT_FOUND", async () => {
    mockApptSvc.bookSlot.mockResolvedValueOnce({ ok: false, code: "NOT_FOUND" });
    const app = appFactory();
    const res = await request(app).post("/patients/me/appointments").send({
      slotId: UUID,
      symptoms: "Chest pain",
    });
    expect(res.status).toBe(404);
  });

  test("POST /patients/me/appointments → 409 ALREADY_BOOKED", async () => {
    mockApptSvc.bookSlot.mockResolvedValueOnce({ ok: false, code: "ALREADY_BOOKED" });
    const app = appFactory();
    const res = await request(app).post("/patients/me/appointments").send({
      slotId: UUID,
    });
    expect(res.status).toBe(409);
  });

  test("POST /patients/me/appointments → 201 success", async () => {
    mockApptSvc.bookSlot.mockResolvedValueOnce({
      ok: true,
      appointment: { id: "a1", availability_slot_id: "s1", patient_id: "pat-1" },
    });
    const app = appFactory();
    const res = await request(app).post("/patients/me/appointments").send({
      slotId: UUID,
      symptoms: "Headache",
    });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: "a1", availability_slot_id: "s1", patient_id: "pat-1" });
  });

  test("GET /patients/me/appointments → 200 list", async () => {
    mockApptSvc.listMyAppointments.mockResolvedValueOnce([{ id: "a1" }]);
    const app = appFactory();
    const res = await request(app).get("/patients/me/appointments");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "a1" }]);
  });

  test("PATCH /patients/me/appointments/:id/cancel → 404 NOT_FOUND", async () => {
    mockApptSvc.cancelAppointment.mockResolvedValueOnce({ ok: false, code: "NOT_FOUND" });
    const app = appFactory();
    const res = await request(app).patch("/patients/me/appointments/a404/cancel");
    expect(res.status).toBe(404);
  });

  test("PATCH /patients/me/appointments/:id/cancel → 409 ALREADY_CANCELLED", async () => {
    mockApptSvc.cancelAppointment.mockResolvedValueOnce({ ok: false, code: "ALREADY_CANCELLED" });
    const app = appFactory();
    const res = await request(app).patch("/patients/me/appointments/a1/cancel");
    expect(res.status).toBe(409);
  });

  test("PATCH /patients/me/appointments/:id/cancel → 204 success", async () => {
    mockApptSvc.cancelAppointment.mockResolvedValueOnce({ ok: true });
    const app = appFactory();
    const res = await request(app).patch("/patients/me/appointments/a1/cancel");
    expect(res.status).toBe(204);
  });
});
