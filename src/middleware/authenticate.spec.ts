import { authenticate } from "./authenticate.js";
import { sign } from "../libs/jwt/index.js";

function mockReqRes() {
  const req: any = { headers: {} };
  const res: any = {
    statusCode: 200,
    body: null,
    status(c: number) {
      this.statusCode = c;
      return this;
    },
    json(o: any) {
      this.body = o;
      return this;
    },
  };
  const next = jest.fn();
  return { req, res, next };
}

describe("middleware/authenticate", () => {
  const secret = "s";

  it("sets req.user on valid token", () => {
    const now = Math.floor(Date.now() / 1000);
    const token = sign(
      {
        sub: "u1",
        role: "doctor",
        iat: now,
        exp: now + 60,
        iss: "hospital-api",
      },
      secret,
    );

    const { req, res, next } = mockReqRes();
    req.headers.authorization = `Bearer ${token}`;

    authenticate(secret)(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: "u1", role: "doctor" });
  });

  it("401 on missing token", () => {
    const { req, res, next } = mockReqRes();
    authenticate(secret)(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("401 on invalid token", () => {
    const { req, res, next } = mockReqRes();
    req.headers.authorization = `Bearer not-a-token`;
    authenticate(secret)(req, res, next);
    expect(res.statusCode).toBe(401);
  });
});
