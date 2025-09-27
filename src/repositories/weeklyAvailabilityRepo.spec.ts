import { weeklyAvailabilityRepository } from "./weeklyAvailabilityRepository.js";

function makeDb() {
  return {
    query: jest.fn(),
    pool: { query: jest.fn() },
  } as any;
}

describe("weeklyAvailabilityRepository", () => {
  describe("list", () => {
    it("returns rows ordered by weekday, start_time", async () => {
      const db = makeDb();
      const rows = [
        {
          id: "wa-1",
          doctor_id: "d1",
          weekday: 1,
          start_time: "09:00:00",
          end_time: "12:00:00",
          slot_duration_mins: 30,
          timezone: "Europe/Istanbul",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ];
      db.query.mockResolvedValueOnce({ rows });

      const repo = weeklyAvailabilityRepository(db);
      const out = await repo.list("d1");

      expect(out).toEqual(rows);
      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain("FROM weekly_availability");
      expect(sql).toContain("ORDER BY weekday ASC, start_time ASC");
      expect(params).toEqual(["d1"]);
    });
  });

  describe("upsert", () => {
    it("deletes old config and returns [] when rows empty", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rowCount: 2 }); // DELETE
      const repo = weeklyAvailabilityRepository(db);

      const res = await repo.upsert("d1", []);
      expect(res).toEqual([]);
      expect(db.query).toHaveBeenCalledTimes(1);
      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain("DELETE FROM weekly_availability WHERE doctor_id = $1");
      expect(params).toEqual(["d1"]);
    });

    it("delete + insert many new rows and return inserted", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rowCount: 0 });
      const inserted = [
        {
          id: "wa-1",
          doctor_id: "d1",
          weekday: 1,
          start_time: "09:00:00",
          end_time: "12:00:00",
          slot_duration_mins: 30,
          timezone: "Europe/Istanbul",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "wa-2",
          doctor_id: "d1",
          weekday: 3,
          start_time: "14:00:00",
          end_time: "17:00:00",
          slot_duration_mins: 30,
          timezone: "Europe/Istanbul",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ];
      db.query.mockResolvedValueOnce({ rows: inserted });

      const repo = weeklyAvailabilityRepository(db);
      const res = await repo.upsert("d1", [
        {
          weekday: 1,
          start_time: "09:00:00",
          end_time: "12:00:00",
          slot_duration_mins: 30,
          timezone: "Europe/Istanbul",
        },
        {
          weekday: 3,
          start_time: "14:00:00",
          end_time: "17:00:00",
          slot_duration_mins: 30,
          timezone: "Europe/Istanbul",
        },
      ]);

      expect(res).toEqual(inserted);
      expect(db.query).toHaveBeenCalledTimes(2);

      const [insertSql, insertParams] = db.query.mock.calls[1];
      expect(insertSql).toContain("INSERT INTO weekly_availability");
      expect(insertParams.length).toBe(2 * 6);
      expect(insertParams[0]).toBe("d1");
      expect(insertParams[1]).toBe(1);
      expect(insertParams[6]).toBe("d1");
      expect(insertParams[7]).toBe(3);
    });
  });
});
