import crypto from "node:crypto";
import { refreshTokenRepository, newOpaqueToken } from "./refreshTokensRepository.js";

function makeDb() {
  return {
    query: jest.fn(),
    pool: { query: jest.fn() },
  } as any;
}

function sha256(input: string | Buffer) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

describe("refreshTokensRepository", () => {
  describe("newOpaqueToken", () => {
    it("generates url-safe random token", () => {
      const t = newOpaqueToken();
      expect(typeof t).toBe("string");
      expect(t.length).toBeGreaterThanOrEqual(40); 
      expect(/^[A-Za-z0-9\-_]+$/.test(t)).toBe(true);
    });
  });

  describe("insert", () => {
    it("stores hashed token with metadata and returns row", async () => {
      const db = makeDb();
      const fakeRow = {
        id: "rt1",
        user_id: "u1",
        token_hash: "hash",
        expires_at: "2026-01-01T00:00:00.000Z",
        revoked_at: null,
        created_at: "2025-01-01T00:00:00.000Z",
        user_agent: "jest",
        ip_address: "127.0.0.1",
      };
      db.query.mockResolvedValueOnce({ rows: [fakeRow] });

      const repo = refreshTokenRepository(db);
      const plaintext = "my-opaque-token";
      const meta = { userAgent: "jest", ip: "127.0.0.1" };

      const res = await repo.insert("u1", plaintext, 30, meta);
      expect(res).toEqual(fakeRow);

      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain("INSERT INTO refresh_tokens");
      expect(params[0]).toBe("u1");
      expect(params[1]).toBe(sha256(plaintext));
      expect(params[2]).toBe(30);
      expect(params[3]).toBe("jest");
      expect(params[4]).toBe("127.0.0.1");
    });
  });

  describe("findValid", () => {
    it("returns id + user_id when token is valid", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rows: [{ id: "rt1", user_id: "u1" }] });

      const repo = refreshTokenRepository(db);
      const res = await repo.findValid("opaque");
      expect(res).toEqual({ id: "rt1", user_id: "u1" });

      const [, params] = db.query.mock.calls[0];
      expect(params).toEqual([sha256("opaque")]);
    });

    it("returns null when not found", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rows: [] });
      const repo = refreshTokenRepository(db);

      const res = await repo.findValid("nope");
      expect(res).toBeNull();
    });
  });

  describe("revoke", () => {
    it("revokes by plaintext token", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rowCount: 1 });

      const repo = refreshTokenRepository(db);
      await repo.revoke("xx");
      const [, params] = db.query.mock.calls[0];
      expect(params).toEqual([sha256("xx")]);
    });
  });

  describe("revokeById", () => {
    it("revokes by id", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rowCount: 1 });

      const repo = refreshTokenRepository(db);
      await repo.revokeById("rt1");
      const [, params] = db.query.mock.calls[0];
      expect(params).toEqual(["rt1"]);
    });
  });

  describe("revokeAllForUser", () => {
    it("returns rowCount of revoked tokens", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rowCount: 3 });

      const repo = refreshTokenRepository(db);
      const n = await repo.revokeAllForUser("u1");
      expect(n).toBe(3);

      const [, params] = db.query.mock.calls[0];
      expect(params).toEqual(["u1"]);
    });
  });

  describe("listForUser", () => {
    it("excludes revoked by default", async () => {
      const db = makeDb();
      const rows = [{ id: "rt1" }, { id: "rt2" }];
      db.query.mockResolvedValueOnce({ rows });

      const repo = refreshTokenRepository(db);
      const out = await repo.listForUser("u1");

      expect(out).toBe(rows);
      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain("WHERE user_id = $1");
      expect(sql).toContain("AND revoked_at IS NULL");
      expect(params).toEqual(["u1"]);
    });

    it("includes revoked when includeRevoked=true", async () => {
      const db = makeDb();
      const rows = [{ id: "rtX" }];
      db.query.mockResolvedValueOnce({ rows });

      const repo = refreshTokenRepository(db);
      const out = await repo.listForUser("u2", { includeRevoked: true });
      expect(out).toBe(rows);

      const [sql] = db.query.mock.calls[0];
      expect(sql).not.toContain("AND revoked_at IS NULL");
    });
  });

  describe("purgeStale", () => {
    it("deletes expired or revoked tokens", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rowCount: 5 });

      const repo = refreshTokenRepository(db);
      const n = await repo.purgeStale();
      expect(n).toBe(5);
    });
  });

  describe("enforceMaxActiveForUser", () => {
    it("revokes older sessions beyond keepLatest", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rowCount: 2 });

      const repo = refreshTokenRepository(db);
      const n = await repo.enforceMaxActiveForUser("u1", 3);
      expect(n).toBe(2);

      const [, params] = db.query.mock.calls[0];
      expect(params).toEqual(["u1", 3]);
    });
  });
});
