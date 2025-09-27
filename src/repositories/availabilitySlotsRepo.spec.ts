import { availabilitySlotsRepository } from "./availabilitySlotsRepository.js";

function makeDb() {
  return {
    query: jest.fn(),
    pool: { query: jest.fn() },
  } as any;
}

describe("availabilitySlotsRepository", () => {
  describe("bulkInsertGenerated", () => {
    it("returns 0 when no slots", async () => {
      const db = makeDb();
      const repo = availabilitySlotsRepository(db);

      const n = await repo.bulkInsertGenerated("doc-1", "spec-1", []);
      expect(n).toBe(0);
      expect(db.query).not.toHaveBeenCalled();
    });

    it("inserts many and returns rowCount", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rowCount: 2 });
      const repo = availabilitySlotsRepository(db);

      const slots = [
        {
          start_time: "2026-01-01T09:00:00.000Z",
          end_time: "2026-01-01T09:30:00.000Z",
          duration_mins: 30,
        },
        {
          start_time: "2026-01-01T09:30:00.000Z",
          end_time: "2026-01-01T10:00:00.000Z",
          duration_mins: 30,
        },
      ];
      const n = await repo.bulkInsertGenerated("doc-1", "spec-1", slots);
      expect(n).toBe(2);

      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain("INSERT INTO availability_slots");
      expect(params.length).toBe(slots.length * 6);
      expect(params[0]).toBe("doc-1");
      expect(params[1]).toBe("spec-1");
    });
  });

  describe("search", () => {
    it("returns items and total with clamped limit/offset", async () => {
      const db = makeDb();
      const items = [
        {
          id: "s1",
          doctor_id: "doc-1",
          specialization_id: "spec-1",
          start_time: "2026-01-01T09:00:00.000Z",
          end_time: "2026-01-01T09:30:00.000Z",
          duration_mins: 30,
          is_booked: false,
          source: "generated",
          created_at: "2025-12-01T00:00:00.000Z",
        },
      ];
      db.query
        .mockResolvedValueOnce({ rows: items }) // items query
        .mockResolvedValueOnce({ rows: [{ count: 10 }] }); // count query

      const repo = availabilitySlotsRepository(db);
      const res = await repo.search({
        specializationId: "spec-1",
        fromIso: "2026-01-01T00:00:00.000Z",
        toIso: "2026-01-15T00:00:00.000Z",
        limit: 999, 
        offset: -5, 
      });

      expect(res.items).toEqual(items);
      expect(res.total).toBe(10);
      expect(res.limit).toBe(100);
      expect(res.offset).toBe(0);

      const firstParams = db.query.mock.calls[0][1];
      const secondParams = db.query.mock.calls[1][1];
      expect(firstParams).toEqual(secondParams);
      expect(firstParams).toEqual([
        "spec-1",
        "2026-01-01T00:00:00.000Z",
        "2026-01-15T00:00:00.000Z",
      ]);
    });
  });

  describe("byId", () => {
    it("returns row when found", async () => {
      const db = makeDb();
      const row = { id: "s1" };
      db.query.mockResolvedValueOnce({ rows: [row] });
      const repo = availabilitySlotsRepository(db);

      const res = await repo.byId("s1");
      expect(res).toEqual(row);
      expect(db.query.mock.calls[0][1]).toEqual(["s1"]);
    });

    it("returns null when not found", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rows: [] });
      const repo = availabilitySlotsRepository(db);

      const res = await repo.byId("missing");
      expect(res).toBeNull();
    });
  });

  describe("lockForUpdate / markBooked / markFree", () => {
    it("locks the slot and toggles booked flag", async () => {
      const db = makeDb();
      const client = { query: jest.fn() };
      client.query.mockResolvedValueOnce({ rows: [{ id: "s1", is_booked: false }] });

      const repo = availabilitySlotsRepository(db);
      const row = await repo.lockForUpdate(client as any, "s1");
      expect(row).toEqual({ id: "s1", is_booked: false });
      expect(client.query).toHaveBeenCalledWith(
        "SELECT * FROM availability_slots WHERE id = $1 FOR UPDATE",
        ["s1"],
      );

      await repo.markBooked(client as any, "s1");
      expect(client.query).toHaveBeenCalledWith(
        "UPDATE availability_slots SET is_booked = true WHERE id = $1",
        ["s1"],
      );

      await repo.markFree(client as any, "s1");
      expect(client.query).toHaveBeenCalledWith(
        "UPDATE availability_slots SET is_booked = false WHERE id = $1",
        ["s1"],
      );
    });
  });
});
