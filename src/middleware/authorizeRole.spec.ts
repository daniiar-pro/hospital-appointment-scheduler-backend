import { authorizeRole } from "./authenticate.js"; 

function mockReqRes(user?: any) {
  const req: any = { user };
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

describe("middleware/authorizeRole", () => {
  it("allows matching role", () => {
    const { req, res, next } = mockReqRes({ role: "admin" });
    authorizeRole("admin")(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("403 if role does not match", () => {
    const { req, res, next } = mockReqRes({ role: "patient" });
    authorizeRole("doctor")(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("403 if no user", () => {
    const { req, res, next } = mockReqRes();
    authorizeRole("admin")(req, res, next);
    expect(res.statusCode).toBe(403);
  });
});
