import { userRepository } from "./userRepository.js";

function makeDb() {
  return {
    query: jest.fn(),
    pool: { query: jest.fn() },
  } as any;
}

const fullRow = {
  id: "u-1",
  username: "john",
  email: "john@example.com",
  password_hash: "hash",
  role: "patient",
  token_version: 0,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("userRepository", () => {
  describe("createUser", () => {
    it("inserts and returns full row", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rows: [fullRow] });

      const repo = userRepository(db);
      const res = await repo.createUser({
        username: "john",
        email: "john@example.com",
        passwordHash: "hash",
      });

      expect(res).toEqual(fullRow);
      expect(db.query).toHaveBeenCalledTimes(1);
      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain("INSERT INTO users");
      expect(params).toEqual(["john", "john@example.com", "hash", "patient"]);
    });

    it("throws EMAIL_TAKEN on unique violation", async () => {
      const db = makeDb();
      db.query.mockRejectedValueOnce({ code: "23505" });

      const repo = userRepository(db);
      await expect(
        repo.createUser({
          username: "john",
          email: "john@example.com",
          passwordHash: "hash",
        }),
      ).rejects.toThrow("EMAIL_TAKEN");
    });
  });

  describe("findAuthByEmail / findAuthById", () => {
    it("returns row by email", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rows: [fullRow] });
      const repo = userRepository(db);

      const r = await repo.findAuthByEmail("john@example.com");
      expect(r).toEqual(fullRow);
      expect(db.query.mock.calls[0][1]).toEqual(["john@example.com"]);
    });

    it("returns null if not found by email", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rows: [] });
      const repo = userRepository(db);

      const r = await repo.findAuthByEmail("none@example.com");
      expect(r).toBeNull();
    });

    it("returns row by id", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rows: [fullRow] });
      const repo = userRepository(db);

      const r = await repo.findAuthById("u-1");
      expect(r).toEqual(fullRow);
      expect(db.query.mock.calls[0][1]).toEqual(["u-1"]);
    });

    it("returns null if not found by id", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rows: [] });
      const repo = userRepository(db);

      const r = await repo.findAuthById("missing");
      expect(r).toBeNull();
    });
  });

  describe("getPublicByEmail / getPublicById", () => {
    it("returns projection by email", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: "u-1",
            username: "john",
            email: "john@example.com",
            role: "patient",
          },
        ],
      });
      const repo = userRepository(db);

      const r = await repo.getPublicByEmail("john@example.com");
      expect(r).toEqual({
        id: "u-1",
        username: "john",
        email: "john@example.com",
        role: "patient",
      });
    });

    it("returns projection by id", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: "u-1",
            username: "john",
            email: "john@example.com",
            role: "patient",
          },
        ],
      });
      const repo = userRepository(db);

      const r = await repo.getPublicById("u-1");
      expect(r).toEqual({
        id: "u-1",
        username: "john",
        email: "john@example.com",
        role: "patient",
      });
    });

    it("returns null when public not found", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rows: [] });
      const repo = userRepository(db);

      const r = await repo.getPublicByEmail("nope@example.com");
      expect(r).toBeNull();
    });
  });

  describe("existsByEmail", () => {
    it("true when rowCount > 0", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rowCount: 1 });
      const repo = userRepository(db);

      await expect(repo.existsByEmail("john@example.com")).resolves.toBe(true);
    });

    it("false when rowCount = 0", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rowCount: 0 });
      const repo = userRepository(db);

      await expect(repo.existsByEmail("none@example.com")).resolves.toBe(false);
    });
  });

  describe("listPublicUsers", () => {
    it("applies role + q, clamps limit/offset, and orders asc", async () => {
      const db = makeDb();
      db.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: "u-1",
              username: "john",
              email: "john@example.com",
              role: "patient",
            },
          ],
        }) // items
        .mockResolvedValueOnce({ rows: [{ count: 1 }] }); // count

      const repo = userRepository(db);
      const out = await repo.listPublicUsers({
        role: "patient",
        q: "john",
        limit: 999, // clamp to 100
        offset: -5, // clamp to 0
        order: "created_asc",
      });

      expect(out.total).toBe(1);
      expect(out.limit).toBe(100);
      expect(out.offset).toBe(0);

      const params1 = db.query.mock.calls[0][1];
      const params2 = db.query.mock.calls[1][1];
      expect(params1).toEqual(params2);
      expect(params1).toEqual(["patient", "%john%"]);
    });

    it("works with no filters (defaults)", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ count: 0 }] });

      const repo = userRepository(db);
      const out = await repo.listPublicUsers();
      expect(out.total).toBe(0);
      expect(out.limit).toBe(20);
      expect(out.offset).toBe(0);
    });
  });

  describe("updatePasswordHash / incrementTokenVersion", () => {
    it("updatePasswordHash sets new hash and bumps version", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({
        rows: [{ ...fullRow, password_hash: "new", token_version: 1 }],
      });
      const repo = userRepository(db);

      const r = await repo.updatePasswordHash("u-1", "new");
      expect(r?.password_hash).toBe("new");
      expect(r?.token_version).toBe(1);

      const [, params] = db.query.mock.calls[0];
      expect(params).toEqual(["u-1", "new"]);
    });

    it("incrementTokenVersion bumps version", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({
        rows: [{ ...fullRow, token_version: 1 }],
      });
      const repo = userRepository(db);

      const r = await repo.incrementTokenVersion("u-1");
      expect(r?.token_version).toBe(1);
      expect(db.query.mock.calls[0][1]).toEqual(["u-1"]);
    });
  });

  describe("deleteUser", () => {
    it("returns true when row deleted", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rowCount: 1 });
      const repo = userRepository(db);

      await expect(repo.deleteUser("u-1")).resolves.toBe(true);
    });

    it("returns false when no row deleted", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rowCount: 0 });
      const repo = userRepository(db);

      await expect(repo.deleteUser("u-1")).resolves.toBe(false);
    });
  });

  describe("findManyPublicByIds", () => {
    it("returns [] for empty input", async () => {
      const db = makeDb();
      const repo = userRepository(db);
      const res = await repo.findManyPublicByIds([]);
      expect(res).toEqual([]);
      expect(db.query).not.toHaveBeenCalled();
    });

    it("returns rows for ids", async () => {
      const db = makeDb();
      const rows = [
        {
          id: "u-1",
          username: "john",
          email: "john@example.com",
          role: "patient",
        },
        {
          id: "u-2",
          username: "amy",
          email: "amy@example.com",
          role: "doctor",
        },
      ];
      db.query.mockResolvedValueOnce({ rows });
      const repo = userRepository(db);

      const res = await repo.findManyPublicByIds(["u-1", "u-2"]);
      expect(res).toEqual(rows);
      expect(db.query.mock.calls[0][1]).toEqual([["u-1", "u-2"]]);
    });
  });

  describe("setRoleAndBumpVersion", () => {
    it("sets role and bumps version", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({
        rows: [{ ...fullRow, role: "admin", token_version: 1 }],
      });
      const repo = userRepository(db);

      const r = await repo.setRoleAndBumpVersion("u-1", "admin");
      expect(r?.role).toBe("admin");
      expect(r?.token_version).toBe(1);
      expect(db.query.mock.calls[0][1]).toEqual(["u-1", "admin"]);
    });
  });
});
