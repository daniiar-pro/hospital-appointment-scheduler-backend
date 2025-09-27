import { hashPassword, verifyPassword } from "./password.js";

describe("auth/password", () => {
  it("hashes and verifies correctly", async () => {
    const pw = "Str0ngPass!";
    const h = await hashPassword(pw);
    expect(h).toMatch(/^scrypt:/);
    await expect(verifyPassword(pw, h)).resolves.toBe(true);
    await expect(verifyPassword("wrong", h)).resolves.toBe(false);
  });
});
