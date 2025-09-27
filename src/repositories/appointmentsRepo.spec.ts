import { appointmentsRepository } from "./appointmentsRepository.js";

function makeDb() {
  return {
    query: jest.fn(),
    pool: { query: jest.fn() },
  } as any;
}

describe("appointmentsRepository", () => {
  describe("bookSlotAtomic", () => {
    it("returns appointment row when slot reserved", async () => {
      const db = makeDb();
      const apptRow = {
        id: "appt-1",
        availability_slot_id: "slot-1",
        patient_id: "pat-1",
        status: "confirmed",
        symptoms: "Chest pain",
        notes: null,
        booked_at: new Date().toISOString(),
        cancelled_at: null,
      };

      db.query.mockResolvedValueOnce({ rows: [apptRow] });
      const repo = appointmentsRepository(db);

      const res = await repo.bookSlotAtomic("slot-1", "pat-1", "Chest pain");
      expect(res).toEqual(apptRow);
      expect(db.query).toHaveBeenCalledTimes(1);
      const [sql, params] = db.query.mock.calls[0];
      expect(typeof sql).toBe("string");
      expect(params).toEqual(["slot-1", "pat-1", "Chest pain"]);
    });

    it("returns null when slot not found or already booked", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rows: [] });
      const repo = appointmentsRepository(db);

      const res = await repo.bookSlotAtomic("missing-slot", "pat-1", null);
      expect(res).toBeNull();
    });
  });

  describe("cancelAtomic", () => {
    it("returns true when cancellation succeeded and slot freed", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rows: [{ appt_count: 1 }] });
      const repo = appointmentsRepository(db);

      const ok = await repo.cancelAtomic("appt-1", "pat-1");
      expect(ok).toBe(true);
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(db.query.mock.calls[0][1]).toEqual(["appt-1", "pat-1"]);
    });

    it("returns false when nothing to cancel", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rows: [{ appt_count: 0 }] });
      const repo = appointmentsRepository(db);

      const ok = await repo.cancelAtomic("appt-1", "pat-1");
      expect(ok).toBe(false);
    });
  });

  describe("byIdForPatient", () => {
    it("returns appointment when found", async () => {
      const db = makeDb();
      const row = { id: "a1", patient_id: "p1" };
      db.query.mockResolvedValueOnce({ rows: [row] });
      const repo = appointmentsRepository(db);

      const res = await repo.byIdForPatient("a1", "p1");
      expect(res).toEqual(row);
      expect(db.query.mock.calls[0][1]).toEqual(["a1", "p1"]);
    });

    it("returns null when not found", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rows: [] });
      const repo = appointmentsRepository(db);

      const res = await repo.byIdForPatient("a1", "pX");
      expect(res).toBeNull();
    });
  });

  describe("listForPatient", () => {
    it("builds range filter and returns rows", async () => {
      const db = makeDb();
      const rows = [{ id: "a1" }, { id: "a2" }];
      db.query.mockResolvedValueOnce({ rows });
      const repo = appointmentsRepository(db);

      const from = "2026-01-01T00:00:00.000Z";
      const to = "2026-01-08T00:00:00.000Z";
      const res = await repo.listForPatient("pat-1", from, to);

      expect(res).toEqual(rows);
      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain("JOIN availability_slots s");
      expect(sql).toContain("ORDER BY s.start_time ASC");
      expect(params).toEqual(["pat-1", from, to]);
    });

    it("works without optional range", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rows: [] });
      const repo = appointmentsRepository(db);

      await repo.listForPatient("pat-1");
      const [, params] = db.query.mock.calls[0];
      expect(params).toEqual(["pat-1"]);
    });
  });

  describe("listForDoctor", () => {
    it("returns rows with optional range", async () => {
      const db = makeDb();
      const rows = [{ id: "a1" }];
      db.query.mockResolvedValueOnce({ rows });
      const repo = appointmentsRepository(db);

      const res = await repo.listForDoctor(
        "doc-1",
        "2026-01-01T00:00:00.000Z",
        "2026-01-02T00:00:00.000Z",
      );
      expect(res).toEqual(rows);
      const [, params] = db.query.mock.calls[0];
      expect(params).toEqual(["doc-1", "2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z"]);
    });
  });
});
