import type { Database } from "../../database/index.js";

const mockUsersRepo = {
  listPublicUsers: jest.fn(),
  getPublicById: jest.fn(),
  updateUser: jest.fn(),
  incrementTokenVersion: jest.fn(),
  deleteUser: jest.fn(),
};
jest.mock("../../repositories/userRepository.js", () => ({
  userRepository: jest.fn(() => mockUsersRepo),
}));

const mockTokensRepo = {
  revokeAllForUser: jest.fn(),
};
jest.mock("../../repositories/refreshTokensRepository.js", () => ({
  refreshTokenRepository: jest.fn(() => mockTokensRepo),
}));

import { makeUsersService } from "./service.js";

function makeDb(): Database {
  return { query: jest.fn(), pool: {} as any, close: jest.fn() } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("services/admin/users", () => {
  it("list -> forwards to users.listPublicUsers", async () => {
    const db = makeDb();
    const svc = makeUsersService(db);

    const expected = { items: [], total: 0, limit: 20, offset: 0 };
    mockUsersRepo.listPublicUsers.mockResolvedValueOnce(expected);

    const out = await svc.list({ role: "patient", q: "john" } as any);
    expect(out).toBe(expected);
    expect(mockUsersRepo.listPublicUsers).toHaveBeenCalledWith({ role: "patient", q: "john" });
  });

  it("getPublic -> forwards to users.getPublicById", async () => {
    const db = makeDb();
    const svc = makeUsersService(db);

    mockUsersRepo.getPublicById.mockResolvedValueOnce({
      id: "u1",
      username: "john",
      email: "j@example.com",
      role: "doctor",
    });
    const out = await svc.getPublic("u1");

    expect(out).toEqual({ id: "u1", username: "john", email: "j@example.com", role: "doctor" });
  });

  describe("changeRole", () => {
    it("returns null if user not found", async () => {
      const db = makeDb();
      const svc = makeUsersService(db);

      mockUsersRepo.updateUser.mockResolvedValueOnce(null);
      const out = await svc.changeRole("missing", "doctor");
      expect(out).toBeNull();
      expect(mockUsersRepo.incrementTokenVersion).not.toHaveBeenCalled();
    });

    it("updates role, bumps token version, returns projection", async () => {
      const db = makeDb();
      const svc = makeUsersService(db);

      mockUsersRepo.updateUser.mockResolvedValueOnce({
        id: "u1",
        username: "john",
        email: "j@example.com",
        password_hash: "hash",
        role: "doctor",
        token_version: 1,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      });
      mockUsersRepo.incrementTokenVersion.mockResolvedValueOnce({
        id: "u1",
        username: "john",
        email: "j@example.com",
        password_hash: "hash",
        role: "doctor",
        token_version: 2,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      });

      const out = await svc.changeRole("u1", "doctor");
      expect(out).toEqual({ id: "u1", email: "j@example.com", role: "doctor" });
      expect(mockUsersRepo.updateUser).toHaveBeenCalledWith("u1", { role: "doctor" });
      expect(mockUsersRepo.incrementTokenVersion).toHaveBeenCalledWith("u1");
    });
  });

  describe("updateProfileAdmin", () => {
    it("returns projection when updated", async () => {
      const db = makeDb();
      const svc = makeUsersService(db);

      mockUsersRepo.updateUser.mockResolvedValueOnce({
        id: "u1",
        username: "amy",
        email: "a@example.com",
        password_hash: "hash",
        role: "patient",
        token_version: 0,
        created_at: "2026-01-01",
        updated_at: "2026-01-02",
      });

      const out = await svc.updateProfileAdmin("u1", { username: "amy" });
      expect(out).toEqual({ id: "u1", username: "amy", email: "a@example.com", role: "patient" });
      expect(mockUsersRepo.updateUser).toHaveBeenCalledWith("u1", { username: "amy" });
    });

    it("returns null if user not found", async () => {
      const db = makeDb();
      const svc = makeUsersService(db);

      mockUsersRepo.updateUser.mockResolvedValueOnce(null);
      const out = await svc.updateProfileAdmin("nope", { username: "x" });
      expect(out).toBeNull();
    });
  });

  it("logoutAllDevices -> forwards to tokens.revokeAllForUser", async () => {
    const db = makeDb();
    const svc = makeUsersService(db);

    mockTokensRepo.revokeAllForUser.mockResolvedValueOnce(5);
    const n = await svc.logoutAllDevices("u1");
    expect(n).toBe(5);
    expect(mockTokensRepo.revokeAllForUser).toHaveBeenCalledWith("u1");
  });

  it("deleteUser -> forwards to users.deleteUser", async () => {
    const db = makeDb();
    const svc = makeUsersService(db);

    mockUsersRepo.deleteUser.mockResolvedValueOnce(true);
    await expect(svc.deleteUser("u1")).resolves.toBe(true);
    expect(mockUsersRepo.deleteUser).toHaveBeenCalledWith("u1");
  });
});
