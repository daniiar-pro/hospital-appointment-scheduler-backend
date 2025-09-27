import { doctorSpecializationsRepository } from "./doctorSpecializationsRepository.js";

function makeDb() {
  return {
    query: jest.fn(),
    pool: { query: jest.fn() },
  } as any;
}

describe("doctorSpecializationsRepository", () => {
  describe("listForDoctor", () => {
    it("returns rows ordered by specialization name", async () => {
      const db = makeDb();
      const rows = [
        {
          id: "ds2",
          doctor_id: "d1",
          specialization_id: "s2",
          created_at: "...",
          name: "Neurology",
          description: null,
        },
        {
          id: "ds1",
          doctor_id: "d1",
          specialization_id: "s1",
          created_at: "...",
          name: "Cardiology",
          description: null,
        },
      ];
      db.query.mockResolvedValueOnce({ rows });

      const repo = doctorSpecializationsRepository(db);
      const res = await repo.listForDoctor("d1");

      expect(res).toBe(rows);
      const [sql, params] = db.query.mock.calls[0];
      expect(typeof sql).toBe("string");
      expect(sql).toContain("JOIN specializations s");
      expect(sql).toContain("ORDER BY s.name ASC");
      expect(params).toEqual(["d1"]);
    });
  });

  describe("upsertMany", () => {
    it("returns [] when no specializationIds", async () => {
      const db = makeDb();
      const repo = doctorSpecializationsRepository(db);
      const res = await repo.upsertMany("d1", []);
      expect(res).toEqual([]);
      expect(db.query).not.toHaveBeenCalled();
    });

    it("inserts and returns created rows", async () => {
      const db = makeDb();
      const rows = [
        { id: "x1", doctor_id: "d1", specialization_id: "s1", created_at: "..." },
        { id: "x2", doctor_id: "d1", specialization_id: "s2", created_at: "..." },
      ];
      db.query.mockResolvedValueOnce({ rows });

      const repo = doctorSpecializationsRepository(db);
      const out = await repo.upsertMany("d1", ["s1", "s2"]);
      expect(out).toEqual(rows);

      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain("UNNEST($2::uuid[])");
      expect(params).toEqual(["d1", ["s1", "s2"]]);
    });
  });

  describe("replaceAll", () => {
    it("deletes old rows then upserts new ones", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rowCount: 2 }); // DELETE
      const repo = doctorSpecializationsRepository(db);

      const spy = jest
        .spyOn(repo as any, "upsertMany")
        .mockResolvedValueOnce([
          { id: "y1", doctor_id: "d1", specialization_id: "s3", created_at: "..." },
        ]);

      const res = await repo.replaceAll("d1", ["s3"]);
      expect(res).toEqual([
        { id: "y1", doctor_id: "d1", specialization_id: "s3", created_at: "..." },
      ]);

      // DELETE call
      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain("DELETE FROM doctor_specializations WHERE doctor_id = $1");
      expect(params).toEqual(["d1"]);

      expect(spy).toHaveBeenCalledWith("d1", ["s3"]);
    });
  });

  describe("removeOne", () => {
    it("returns true when a row was deleted", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rowCount: 1 });

      const repo = doctorSpecializationsRepository(db);
      const ok = await repo.removeOne("d1", "s1");

      expect(ok).toBe(true);
      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain("DELETE FROM doctor_specializations");
      expect(params).toEqual(["d1", "s1"]);
    });

    it("returns false when no row was deleted", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rowCount: 0 });

      const repo = doctorSpecializationsRepository(db);
      const ok = await repo.removeOne("d1", "s2");
      expect(ok).toBe(false);
    });
  });
});
