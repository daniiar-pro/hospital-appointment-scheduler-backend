import express from "express";
import request from "supertest";

const mockDocSvc = {
  getMyProfile: jest.fn(),
  updateMyProfile: jest.fn(),
  listMySpecializations: jest.fn(),
  replaceMySpecializations: jest.fn(),
  removeMySpecialization: jest.fn(),
  listMyWeeklyAvailability: jest.fn(),
  upsertMyWeeklyAvailability: jest.fn(),
  listMySlotExceptions: jest.fn(),
  createMySlotException: jest.fn(),
  removeMySlotException: jest.fn(),
};
const mockSlotsSvc = {
  regenerateForDoctor: jest.fn(),
};
const mockApptRepo = {
  listForDoctor: jest.fn(),
};

jest.mock("../../services/doctor/service.js", () => ({
  makeDoctorsService: () => mockDocSvc,
}));
jest.mock("../../services/slots/service.js", () => ({
  makeSlotsService: () => mockSlotsSvc,
}));
jest.mock("../../repositories/appointmentsRepository.js", () => ({
  appointmentsRepository: () => mockApptRepo,
}));

jest.mock("../../middleware/authenticate.js", () => ({
  authenticate: () => (req: any, _res: any, next: any) => {
    req.user = { id: "doc-1", role: "doctor" };
    next();
  },
  authorizeRole: () => (_req: any, _res: any, next: any) => next(),
}));

import { makeDoctorMeRouter } from "./doctor.js";

function appFactory() {
  const app = express();
  app.use(express.json());
  app.use("/doctors/me", makeDoctorMeRouter({} as any, "secret"));
  return app;
}

const UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("Doctor controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("GET /doctors/me/profile → returns profile", async () => {
    mockDocSvc.getMyProfile.mockResolvedValueOnce({
      id: "doc-1",
      username: "Dr",
      email: "dr@x.com",
      role: "doctor",
    });
    const app = appFactory();
    const res = await request(app).get("/doctors/me/profile");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: "doc-1", role: "doctor" });
    expect(mockDocSvc.getMyProfile).toHaveBeenCalledWith("doc-1");
  });

  test("PATCH /doctors/me (invalid body) → 400", async () => {
    const app = appFactory();
    const res = await request(app).patch("/doctors/me").send({});
    expect(res.status).toBe(400);
    expect(mockDocSvc.updateMyProfile).not.toHaveBeenCalled();
  });

  test("PATCH /doctors/me → 200", async () => {
    mockDocSvc.updateMyProfile.mockResolvedValueOnce({
      id: "doc-1",
      username: "Greg House",
      email: "house@x.com",
      role: "doctor",
    });
    const app = appFactory();
    const res = await request(app).patch("/doctors/me").send({ username: "Greg House" });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe("Greg House");
  });

  test("GET /doctors/me/specializations → 200 list", async () => {
    mockDocSvc.listMySpecializations.mockResolvedValueOnce([
      { id: "ds1", specialization_id: UUID, name: "Cardio" },
    ]);
    const app = appFactory();
    const res = await request(app).get("/doctors/me/specializations");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test("PUT /doctors/me/specializations (invalid) → 400", async () => {
    const app = appFactory();
    const res = await request(app)
      .put("/doctors/me/specializations")
      .send({ specializationIds: [] });
    expect(res.status).toBe(400);
    expect(mockDocSvc.replaceMySpecializations).not.toHaveBeenCalled();
  });

  test("PUT /doctors/me/specializations → 200", async () => {
    mockDocSvc.replaceMySpecializations.mockResolvedValueOnce([{ id: "ds1" }]);
    const app = appFactory();
    const res = await request(app)
      .put("/doctors/me/specializations")
      .send({ specializationIds: [UUID] });
    expect(res.status).toBe(200);
    expect(res.body.assigned).toBe(1);
  });

  test("DELETE /doctors/me/specializations/:specId → 204 when removed", async () => {
    mockDocSvc.removeMySpecialization.mockResolvedValueOnce(true);
    const app = appFactory();
    const res = await request(app).delete(`/doctors/me/specializations/${UUID}`);
    expect(res.status).toBe(204);
  });

  test("GET /doctors/me/weekly-availability → 200", async () => {
    mockDocSvc.listMyWeeklyAvailability.mockResolvedValueOnce([]);
    const app = appFactory();
    const res = await request(app).get("/doctors/me/weekly-availability");
    expect(res.status).toBe(200);
  });

  test("PUT /doctors/me/weekly-availability (invalid) → 400", async () => {
    const app = appFactory();
    const res = await request(app)
      .put("/doctors/me/weekly-availability")
      .send({ items: [{}] });
    expect(res.status).toBe(400);
    expect(mockDocSvc.upsertMyWeeklyAvailability).not.toHaveBeenCalled();
  });

  test("PUT /doctors/me/weekly-availability → 200", async () => {
    mockDocSvc.upsertMyWeeklyAvailability.mockResolvedValueOnce([{ id: "wa1" }]);
    const app = appFactory();
    const res = await request(app)
      .put("/doctors/me/weekly-availability")
      .send({
        items: [
          {
            weekday: 1,
            start_time: "09:00:00",
            end_time: "12:00:00",
            slot_duration_mins: 30,
            timezone: "Europe/Istanbul",
          },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.saved).toBe(1);
  });

  test("GET /doctors/me/slot-exceptions → 200", async () => {
    mockDocSvc.listMySlotExceptions.mockResolvedValueOnce([]);
    const app = appFactory();
    const res = await request(app).get("/doctors/me/slot-exceptions");
    expect(res.status).toBe(200);
  });

  test("POST /doctors/me/slot-exceptions (invalid) → 400", async () => {
    const app = appFactory();
    const res = await request(app)
      .post("/doctors/me/slot-exceptions")
      .send({ day: "2026-01-15", full_day: true, start_time: "09:00:00" });
    expect(res.status).toBe(400);
  });

  test("POST /doctors/me/slot-exceptions → 201", async () => {
    mockDocSvc.createMySlotException.mockResolvedValueOnce({ id: "se1" });
    const app = appFactory();
    const res = await request(app).post("/doctors/me/slot-exceptions").send({
      day: "2026-01-15",
      full_day: true,
      reason: "Conference",
    });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: "se1" });
  });

  test("DELETE /doctors/me/slot-exceptions/:id → 404 when missing", async () => {
    mockDocSvc.removeMySlotException.mockResolvedValueOnce(false);
    const app = appFactory();
    const res = await request(app).delete("/doctors/me/slot-exceptions/se-404");
    expect(res.status).toBe(404);
  });

  test("DELETE /doctors/me/slot-exceptions/:id → 204 when removed", async () => {
    mockDocSvc.removeMySlotException.mockResolvedValueOnce(true);
    const app = appFactory();
    const res = await request(app).delete("/doctors/me/slot-exceptions/se-1");
    expect(res.status).toBe(204);
  });

  test("POST /doctors/me/slots/regenerate (invalid query) → 400", async () => {
    const app = appFactory();
    const res = await request(app).post("/doctors/me/slots/regenerate?weeks=999");
    expect(res.status).toBe(400);
    expect(mockSlotsSvc.regenerateForDoctor).not.toHaveBeenCalled();
  });

  test("POST /doctors/me/slots/regenerate → 200 with inserted count", async () => {
    mockSlotsSvc.regenerateForDoctor.mockResolvedValueOnce({ inserted: 5 });
    const app = appFactory();
    const res = await request(app).post("/doctors/me/slots/regenerate?weeks=6");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ inserted: 5 });
  });

  test("POST /doctors/me/slots/regenerate → 400 when specialization required", async () => {
    const err = new Error("SPECIALIZATION_REQUIRED");
    mockSlotsSvc.regenerateForDoctor.mockRejectedValueOnce(err);
    const app = appFactory();
    const res = await request(app).post("/doctors/me/slots/regenerate?weeks=6");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/specializationId/i);
  });

});
