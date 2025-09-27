import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";

const mockService = {
  signup: jest.fn(),
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
};

jest.mock("../../services/auth/service.js", () => ({
  makeAuthService: () => mockService,
}));

jest.mock("../../middleware/authenticate.js", () => ({
  authenticate: (_secret: string) => (req: any, _res: any, next: any) => {
    req.user = { id: "u-123", role: "patient" };
    next();
  },
}));

import { makeAuthRouter } from "./auth.js";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/auth", makeAuthRouter({} as any, "test-secret"));
  return app;
}

describe("Auth routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("POST /auth/signup → 400 on invalid body", async () => {
    const app = makeApp();
    const res = await request(app).post("/auth/signup").send({ email: "bad" });
    expect(res.status).toBe(400);
    expect(mockService.signup).not.toHaveBeenCalled();
  });

  test("POST /auth/signup → 201 and returns user", async () => {
    mockService.signup.mockResolvedValueOnce({
      id: "u1",
      username: "Alice",
      email: "alice@example.com",
      role: "patient",
    });
    const app = makeApp();
    const res = await request(app).post("/auth/signup").send({
      username: "Alice",
      email: "alice@example.com",
      password: "ChangeIt123!",
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: "u1",
      username: "Alice",
      email: "alice@example.com",
      role: "patient",
    });
    expect(mockService.signup).toHaveBeenCalledWith({
      username: "Alice",
      email: "alice@example.com",
      password: "ChangeIt123!",
    });
  });

  test("POST /auth/signup → 409 when EMAIL_TAKEN", async () => {
    mockService.signup.mockRejectedValueOnce(new Error("EMAIL_TAKEN"));
    const app = makeApp();
    const res = await request(app).post("/auth/signup").send({
      username: "Alice",
      email: "alice@example.com",
      password: "ChangeIt123!",
    });
    expect(res.status).toBe(409);
  });

  test("POST /auth/login → 400 on invalid body", async () => {
    const app = makeApp();
    const res = await request(app).post("/auth/login").send({ email: "bad" });
    expect(res.status).toBe(400);
    expect(mockService.login).not.toHaveBeenCalled();
  });

  test("POST /auth/login → 401 when invalid credentials", async () => {
    mockService.login.mockResolvedValueOnce(null);
    const app = makeApp();
    const res = await request(app).post("/auth/login").send({ email: "a@b.com", password: "nope" });
    expect(res.status).toBe(401);
  });

  test("POST /auth/login → 200, sets cookie, returns access token", async () => {
    mockService.login.mockResolvedValueOnce({
      user: { id: "u1", username: "A", email: "a@b.com", role: "patient" },
      accessToken: "ACCESS",
      refreshPlain: "REFRESH",
    });
    const app = makeApp();
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "a@b.com", password: "secretsecret" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      message: "You signed in as patient",
      accessToken: "ACCESS",
    });
    const setCookie = res.get("Set-Cookie")?.join(";") ?? "";
    expect(setCookie).toContain("refreshToken=REFRESH");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Strict");
  });

  test("POST /auth/refresh → 401 without cookie", async () => {
    const app = makeApp();
    const res = await request(app).post("/auth/refresh");
    expect(res.status).toBe(401);
    expect(mockService.refresh).not.toHaveBeenCalled();
  });

  test("POST /auth/refresh → 401 when service returns null", async () => {
    mockService.refresh.mockResolvedValueOnce(null);
    const app = makeApp();
    const res = await request(app).post("/auth/refresh").set("Cookie", ["refreshToken=OLD"]);
    expect(res.status).toBe(401);
  });

  test("POST /auth/refresh → 200 sets new cookie and returns access token", async () => {
    mockService.refresh.mockResolvedValueOnce({
      accessToken: "NEW_ACCESS",
      refreshPlain: "NEW_REFRESH",
    });
    const app = makeApp();
    const res = await request(app).post("/auth/refresh").set("Cookie", ["refreshToken=OLD"]);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ accessToken: "NEW_ACCESS" });
    const setCookie = res.get("Set-Cookie")?.join(";") ?? "";
    expect(setCookie).toContain("refreshToken=NEW_REFRESH");
  });

  test("POST /auth/logout → 204 and clears cookie", async () => {
    const app = makeApp();
    const res = await request(app).post("/auth/logout").set("Cookie", ["refreshToken=SOMERT"]);
    expect(res.status).toBe(204);
    expect(mockService.logout).toHaveBeenCalledWith("SOMERT");
    expect(res.get("Set-Cookie")?.join(";") ?? "").toContain("refreshToken=");
  });

  test("GET /auth/profile → 200 (authenticate mocked)", async () => {
    const app = makeApp();
    const res = await request(app).get("/auth/profile").set("Authorization", "Bearer anything");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "u-123", role: "patient" });
  });
});
