import { sign, verify } from "./index.js";

describe("libs/jwt", () => {
  const secret = "test-secret";

  it("signs and verifies a token", () => {
    const now = Math.floor(Date.now() / 1000);
    const token = sign(
      {
        sub: "u1",
        role: "patient",
        iat: now,
        exp: now + 60,
        iss: "hospital-api",
      },
      secret,
    );
    const payload = verify(token, secret, { issuer: "hospital-api" });
    expect(payload?.sub).toBe("u1");
    expect(payload?.role).toBe("patient");
  });

  it("rejects wrong issuer", () => {
    const now = Math.floor(Date.now() / 1000);
    const token = sign({ sub: "u1", iat: now, exp: now + 60, iss: "not-me" }, secret);
    expect(verify(token, secret, { issuer: "hospital-api" })).toBeNull();
  });

  it("rejects expired tokens", () => {
    const now = Math.floor(Date.now() / 1000);
    const token = sign({ sub: "u1", iat: now - 120, exp: now - 60, iss: "hospital-api" }, secret);
    expect(verify(token, secret, { issuer: "hospital-api" })).toBeNull();
  });
});
