import { slotExceptionsRepository } from "./slotExceptionsRepository.js";

function makeDb() {
  return {
    query: jest.fn(),
    pool: { query: jest.fn() },
  } as any;
}

describe("slotExceptionsRepository", () => {
  describe("list", () => {
    it("returns rows ordered by day desc and start_time nulls first", async () => {
      const db = makeDb();
      const rows = [
        {
          id: "e2",
          doctor_id: "d1",
          day: "2026-01-02",
          start_time: null,
          end_time: null,
          full_day: true,
          reason: "vacation",
        },
        {
          id: "e1",
          doctor_id: "d1",
          day: "2026-01-01",
          start_time: "09:00:00",
          end_time: "12:00:00",
          full_day: false,
          reason: null,
        },
      ];
      db.query.mockResolvedValueOnce({ rows });

      const repo = slotExceptionsRepository(db);
      const res = await repo.list("d1");

      expect(res).toBe(rows);
      const [sql, params] = db.query.mock.calls[0];
      expect(typeof sql).toBe("string");
      expect(sql).toContain("FROM slot_exceptions");
      expect(sql).toContain("ORDER BY day DESC, start_time NULLS FIRST");
      expect(params).toEqual(["d1"]);
    });
  });

  describe("create", () => {
    it("inserts full-day exception (times null)", async () => {
      const db = makeDb();
      const row = {
        id: "x1",
        doctor_id: "d1",
        day: "2026-01-10",
        start_time: null,
        end_time: null,
        full_day: true,
        reason: "holiday",
      };
      db.query.mockResolvedValueOnce({ rows: [row] });

      const repo = slotExceptionsRepository(db);
      const res = await repo.create("d1", {
        day: "2026-01-10",
        full_day: true,
        reason: "holiday",
      });

      expect(res).toEqual(row);
      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain("INSERT INTO slot_exceptions");
      expect(params).toEqual(["d1", "2026-01-10", null, null, true, "holiday"]);
    });

    it("inserts partial-day exception (with times)", async () => {
      const db = makeDb();
      const row = {
        id: "x2",
        doctor_id: "d1",
        day: "2026-01-11",
        start_time: "10:00:00",
        end_time: "13:00:00",
        full_day: false,
        reason: null,
      };
      db.query.mockResolvedValueOnce({ rows: [row] });

      const repo = slotExceptionsRepository(db);
      const res = await repo.create("d1", {
        day: "2026-01-11",
        full_day: false,
        start_time: "10:00:00",
        end_time: "13:00:00",
      });

      expect(res).toEqual(row);
      const [, params] = db.query.mock.calls[0];
      expect(params).toEqual(["d1", "2026-01-11", "10:00:00", "13:00:00", false, null]);
    });
  });

  describe("remove", () => {
    it("returns true when a row was deleted", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rowCount: 1 });

      const repo = slotExceptionsRepository(db);
      const ok = await repo.remove("ex-1", "d1");

      expect(ok).toBe(true);
      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain("DELETE FROM slot_exceptions");
      expect(params).toEqual(["ex-1", "d1"]);
    });

    it("returns false when no row was deleted", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rowCount: 0 });

      const repo = slotExceptionsRepository(db);
      const ok = await repo.remove("nope", "d1");
      expect(ok).toBe(false);
    });
  });
});
