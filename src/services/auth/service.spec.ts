import { makeAuthService } from "./service.js";

let mockUsersRepo: any;
let mockTokensRepo: any;

jest.mock("../../repositories/userRepository.js", () => ({
  userRepository: () => mockUsersRepo,
}));

jest.mock("../../repositories/refreshTokensRepository.js", () => ({
  refreshTokenRepository: () => mockTokensRepo,
  newOpaqueToken: jest.fn(() => "REFRESH_XYZ"),
}));

jest.mock("../../libs/jwt/password.js", () => ({
  hashPassword: jest.fn(async (p: string) => `HASH(${p})`),
  verifyPassword: jest.fn(async (p: string, h: string) => h === `HASH(${p})`),
}));

jest.mock("../../libs/jwt/index.js", () => ({
  sign: jest.fn(() => "ACCESS_ABC"),
}));

import { hashPassword, verifyPassword } from "../../libs/jwt/password.js";
import { sign } from "../../libs/jwt/index.js";
import { newOpaqueToken } from "../../repositories/refreshTokensRepository.js";

function makeDb() {
  return { query: jest.fn(), pool: { query: jest.fn() } } as any;
}

describe("auth service", () => {
  const jwtSecret = "secret-123";

  beforeEach(() => {
    jest.clearAllMocks();

    mockUsersRepo = {
      createUser: jest.fn(),
      findAuthByEmail: jest.fn(),
      findAuthById: jest.fn(),
    };

    mockTokensRepo = {
      insert: jest.fn(),
      findValid: jest.fn(),
      revoke: jest.fn(),
    };
  });

  describe("signup", () => {
    it("hashes password, creates patient, returns public fields", async () => {
      const db = makeDb();
      const svc = makeAuthService(db, jwtSecret);

      mockUsersRepo.createUser.mockResolvedValueOnce({
        id: "u1",
        username: "john",
        email: "john@example.com",
        role: "patient",
        password_hash: "HASH(pass)",
        token_version: 0,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      });

      const out = await svc.signup({
        username: "john",
        email: "john@example.com",
        password: "pass",
      });

      expect(hashPassword).toHaveBeenCalledWith("pass");
      expect(mockUsersRepo.createUser).toHaveBeenCalledWith({
        username: "john",
        email: "john@example.com",
        passwordHash: "HASH(pass)",
        role: "patient",
      });
      expect(out).toEqual({
        id: "u1",
        username: "john",
        email: "john@example.com",
        role: "patient",
      });
    });
  });

  describe("login", () => {
    it("returns null when user not found", async () => {
      const db = makeDb();
      const svc = makeAuthService(db, jwtSecret);

      mockUsersRepo.findAuthByEmail.mockResolvedValueOnce(null);

      const out = await svc.login("none@example.com", "pass");
      expect(out).toBeNull();
    });

    it("returns null when password invalid", async () => {
      const db = makeDb();
      const svc = makeAuthService(db, jwtSecret);

      mockUsersRepo.findAuthByEmail.mockResolvedValueOnce({
        id: "u1",
        username: "john",
        email: "john@example.com",
        role: "patient",
        password_hash: "HASH(other)",
        token_version: 0,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      });

      const out = await svc.login("john@example.com", "pass");
      expect(verifyPassword).toHaveBeenCalled();
      expect(out).toBeNull();
    });

    it("issues access + refresh, stores refresh, returns payload", async () => {
      const db = makeDb();
      const svc = makeAuthService(db, jwtSecret);

      mockUsersRepo.findAuthByEmail.mockResolvedValueOnce({
        id: "u1",
        username: "john",
        email: "john@example.com",
        role: "patient",
        password_hash: "HASH(pass)",
        token_version: 0,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      });

      const out = await svc.login("john@example.com", "pass");

      expect(sign).toHaveBeenCalled(); 
      expect(newOpaqueToken).toHaveBeenCalled(); 
      expect(mockTokensRepo.insert).toHaveBeenCalledWith("u1", "REFRESH_XYZ", expect.any(Number));

      expect(out).toEqual({
        user: {
          id: "u1",
          username: "john",
          email: "john@example.com",
          role: "patient",
        },
        accessToken: "ACCESS_ABC",
        refreshPlain: "REFRESH_XYZ",
      });
    });
  });

  describe("refresh", () => {
    it("returns null for invalid/expired refresh", async () => {
      const db = makeDb();
      const svc = makeAuthService(db, jwtSecret);

      mockTokensRepo.findValid.mockResolvedValueOnce(null);

      const out = await svc.refresh("REFRESH_OLD");
      expect(out).toBeNull();
    });

    it("rotates refresh and re-issues access", async () => {
      const db = makeDb();
      const svc = makeAuthService(db, jwtSecret);

      mockTokensRepo.findValid.mockResolvedValueOnce({ id: "rt1", user_id: "u1" });
      mockUsersRepo.findAuthById.mockResolvedValueOnce({
        id: "u1",
        username: "john",
        email: "john@example.com",
        role: "patient",
        password_hash: "HASH(pass)",
        token_version: 0,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      });

      const out = await svc.refresh("REFRESH_OLD");

      expect(mockTokensRepo.revoke).toHaveBeenCalledWith("REFRESH_OLD");
      expect(newOpaqueToken).toHaveBeenCalled();
      expect(mockTokensRepo.insert).toHaveBeenCalledWith("u1", "REFRESH_XYZ", expect.any(Number));
      expect(out).toEqual({ accessToken: "ACCESS_ABC", refreshPlain: "REFRESH_XYZ" });
    });
  });

  describe("logout", () => {
    it("revokes when token provided", async () => {
      const db = makeDb();
      const svc = makeAuthService(db, jwtSecret);

      await svc.logout("REFRESH_OLD");
      expect(mockTokensRepo.revoke).toHaveBeenCalledWith("REFRESH_OLD");
    });

    it("no-op when token is undefined", async () => {
      const db = makeDb();
      const svc = makeAuthService(db, jwtSecret);

      await svc.logout(undefined as any);
      expect(mockTokensRepo.revoke).not.toHaveBeenCalled();
    });
  });
});
