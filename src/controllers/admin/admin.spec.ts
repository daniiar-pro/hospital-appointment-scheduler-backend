import express from "express";
import request from "supertest";

const mockUsersSvc = {
  list: jest.fn(),
  getPublic: jest.fn(),
  changeRole: jest.fn(),
  updateProfileAdmin: jest.fn(),
  logoutAllDevices: jest.fn(),
  deleteUser: jest.fn(),
};
const mockSpecsSvc = {
  list: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

jest.mock("../../services/admin/service.js", () => ({
  makeUsersService: () => mockUsersSvc,
}));
jest.mock("../../services/specializations/service.js", () => ({
  makeSpecializationsService: () => mockSpecsSvc,
}));

jest.mock("../../middleware/authenticate.js", () => ({
  authenticate: () => (req: any, _res: any, next: any) => {
    req.user = { id: "admin-1", role: "admin" };
    next();
  },
  authorizeRole: () => (_req: any, _res: any, next: any) => next(),
}));

import { makeAdminRouter } from "./admin.js";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/admin", makeAdminRouter({} as any, "secret"));
  return app;
}

describe("Admin routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("GET /admin/users → 400 on invalid query", async () => {
    const app = makeApp();
    const res = await request(app).get("/admin/users?limit=9999"); 
    expect(res.status).toBe(400);
    expect(mockUsersSvc.list).not.toHaveBeenCalled();
  });

  test("GET /admin/users → 200 list with defaults", async () => {
    mockUsersSvc.list.mockResolvedValueOnce({
      items: [{ id: "u1", username: "A", email: "a@x.com", role: "patient" }],
      total: 1,
      limit: 20,
      offset: 0,
    });
    const app = makeApp();
    const res = await request(app).get("/admin/users");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(mockUsersSvc.list).toHaveBeenCalled();
  });

  test("GET /admin/users/:id → 404 when missing", async () => {
    mockUsersSvc.getPublic.mockResolvedValueOnce(null);
    const app = makeApp();
    const res = await request(app).get("/admin/users/nope");
    expect(res.status).toBe(404);
  });

  test("GET /admin/users/:id → 200 when found", async () => {
    mockUsersSvc.getPublic.mockResolvedValueOnce({
      id: "u1",
      username: "A",
      email: "a@x.com",
      role: "patient",
    });
    const app = makeApp();
    const res = await request(app).get("/admin/users/u1");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: "u1", username: "A" });
  });

  test("PATCH /admin/users/:id/role → 400 invalid body", async () => {
    const app = makeApp();
    const res = await request(app).patch("/admin/users/u1/role").send({ role: "owner" });
    expect(res.status).toBe(400);
    expect(mockUsersSvc.changeRole).not.toHaveBeenCalled();
  });

  test("PATCH /admin/users/:id/role → 200", async () => {
    mockUsersSvc.changeRole.mockResolvedValueOnce({ id: "u1", role: "doctor" });
    const app = makeApp();
    const res = await request(app).patch("/admin/users/u1/role").send({ role: "doctor" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "u1", role: "doctor" });
    expect(mockUsersSvc.changeRole).toHaveBeenCalledWith("u1", "doctor");
  });

  test("PATCH /admin/users/:id → 400 invalid body (empty)", async () => {
    const app = makeApp();
    const res = await request(app).patch("/admin/users/u1").send({});
    expect(res.status).toBe(400);
  });

  test("PATCH /admin/users/:id → 409 on duplicate email", async () => {
    const err: any = new Error("dup");
    err.code = "23505";
    mockUsersSvc.updateProfileAdmin.mockRejectedValueOnce(err);

    const app = makeApp();
    const res = await request(app).patch("/admin/users/u1").send({ email: "taken@example.com" });
    expect(res.status).toBe(409);
  });

  test("PATCH /admin/users/:id → 200 happy path", async () => {
    mockUsersSvc.updateProfileAdmin.mockResolvedValueOnce({
      id: "u1",
      username: "Alice",
      email: "alice@example.com",
      role: "patient",
    });
    const app = makeApp();
    const res = await request(app).patch("/admin/users/u1").send({ username: "Alice" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ username: "Alice" });
  });

  test("POST /admin/users/:id/logout-all → 200 returns revoked count", async () => {
    mockUsersSvc.logoutAllDevices.mockResolvedValueOnce(3);
    const app = makeApp();
    const res = await request(app).post("/admin/users/u1/logout-all");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ revoked: 3 });
  });

  test("DELETE /admin/users/:id → 404 when not found", async () => {
    mockUsersSvc.deleteUser.mockResolvedValueOnce(false);
    const app = makeApp();
    const res = await request(app).delete("/admin/users/u1");
    expect(res.status).toBe(404);
  });

  test("DELETE /admin/users/:id → 204 when deleted", async () => {
    mockUsersSvc.deleteUser.mockResolvedValueOnce(true);
    const app = makeApp();
    const res = await request(app).delete("/admin/users/u1");
    expect(res.status).toBe(204);
  });

  test("GET /admin/specializations → 200 list", async () => {
    mockSpecsSvc.list.mockResolvedValueOnce([{ id: "s1", name: "Cardiology" }]);
    const app = makeApp();
    const res = await request(app).get("/admin/specializations");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "s1", name: "Cardiology" }]);
  });

  test("POST /admin/specializations → 400 invalid body", async () => {
    const app = makeApp();
    const res = await request(app).post("/admin/specializations").send({ name: "A" }); // too short
    expect(res.status).toBe(400);
    expect(mockSpecsSvc.create).not.toHaveBeenCalled();
  });

  test("POST /admin/specializations → 409 duplicate", async () => {
    const err: any = new Error("dup");
    err.code = "23505";
    mockSpecsSvc.create.mockRejectedValueOnce(err);

    const app = makeApp();
    const res = await request(app).post("/admin/specializations").send({ name: "Cardiology" });
    expect(res.status).toBe(409);
  });

  test("POST /admin/specializations → 201 success", async () => {
    mockSpecsSvc.create.mockResolvedValueOnce({ id: "s2", name: "Dermatology", description: null });
    const app = makeApp();
    const res = await request(app).post("/admin/specializations").send({ name: "Dermatology" });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: "s2", name: "Dermatology", description: null });
  });

  test("PATCH /admin/specializations/:id → 400 invalid body", async () => {
    const app = makeApp();
    const res = await request(app).patch("/admin/specializations/s1").send({});
    expect(res.status).toBe(400);
  });

  test("PATCH /admin/specializations/:id → 404 when not found", async () => {
    mockSpecsSvc.update.mockResolvedValueOnce(null);
    const app = makeApp();
    const res = await request(app)
      .patch("/admin/specializations/s1")
      .send({ description: "Heart" });
    expect(res.status).toBe(404);
  });

  test("PATCH /admin/specializations/:id → 409 duplicate", async () => {
    const err: any = new Error("dup");
    err.code = "23505";
    mockSpecsSvc.update.mockRejectedValueOnce(err);

    const app = makeApp();
    const res = await request(app).patch("/admin/specializations/s1").send({ name: "Cardiology" });
    expect(res.status).toBe(409);
  });

  test("PATCH /admin/specializations/:id → 200 success", async () => {
    mockSpecsSvc.update.mockResolvedValueOnce({
      id: "s1",
      name: "Cardiology",
      description: "Heart",
    });
    const app = makeApp();
    const res = await request(app)
      .patch("/admin/specializations/s1")
      .send({ description: "Heart" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "s1", name: "Cardiology", description: "Heart" });
  });

  test("DELETE /admin/specializations/:id → 409 FK in use", async () => {
    const err: any = new Error("fk");
    err.code = "23503";
    mockSpecsSvc.remove.mockRejectedValueOnce(err);

    const app = makeApp();
    const res = await request(app).delete("/admin/specializations/s1");
    expect(res.status).toBe(409);
  });

  test("DELETE /admin/specializations/:id → 404 when not found", async () => {
    mockSpecsSvc.remove.mockResolvedValueOnce(false);
    const app = makeApp();
    const res = await request(app).delete("/admin/specializations/s1");
    expect(res.status).toBe(404);
  });

  test("DELETE /admin/specializations/:id → 204 success", async () => {
    mockSpecsSvc.remove.mockResolvedValueOnce(true);
    const app = makeApp();
    const res = await request(app).delete("/admin/specializations/s1");
    expect(res.status).toBe(204);
  });
});
