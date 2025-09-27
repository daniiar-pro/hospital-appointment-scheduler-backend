import { specializationsRepository } from "./specializationsRepository.js";

function makeDb() {
  return {
    query: jest.fn(),
    pool: { query: jest.fn() },
  } as any;
}

describe("specializationsRepository", () => {
  describe("listAll", () => {
    it("returns rows ordered by name", async () => {
      const db = makeDb();
      const rows = [
        { id: "s1", name: "Cardiology", description: null },
        { id: "s2", name: "Neurology", description: "Nervous system" },
      ];
      db.query.mockResolvedValueOnce({ rows });

      const repo = specializationsRepository(db);
      const res = await repo.listAll();

      expect(res).toBe(rows);
      const [sql] = db.query.mock.calls[0];
      expect(sql).toContain("FROM specializations");
      expect(sql).toContain("ORDER BY name ASC");
    });
  });

  describe("create", () => {
    it("inserts and returns row", async () => {
      const db = makeDb();
      const row = { id: "s3", name: "Oncology", description: "Cancer" };
      db.query.mockResolvedValueOnce({ rows: [row] });

      const repo = specializationsRepository(db);
      const out = await repo.create("Oncology", "Cancer");

      expect(out).toEqual(row);
      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain("INSERT INTO specializations");
      expect(params).toEqual(["Oncology", "Cancer"]);
    });
  });

  describe("update", () => {
    it("updates name only", async () => {
      const db = makeDb();
      const row = { id: "s1", name: "Cardio", description: null };
      db.query.mockResolvedValueOnce({ rows: [row] });

      const repo = specializationsRepository(db);
      const out = await repo.update("s1", { name: "Cardio" });

      expect(out).toEqual(row);
      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain("UPDATE specializations SET name = $1");
      expect(sql).toContain("WHERE id = $2");
      expect(params).toEqual(["Cardio", "s1"]);
    });

    it("updates description only", async () => {
      const db = makeDb();
      const row = { id: "s2", name: "Neurology", description: "Brain & nerves" };
      db.query.mockResolvedValueOnce({ rows: [row] });

      const repo = specializationsRepository(db);
      const out = await repo.update("s2", { description: "Brain & nerves" });

      expect(out).toEqual(row);
      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain("SET description = $1");
      expect(sql).toContain("WHERE id = $2");
      expect(params).toEqual(["Brain & nerves", "s2"]);
    });

    it("updates both name and description", async () => {
      const db = makeDb();
      const row = { id: "s3", name: "Dermatology", description: "Skin" };
      db.query.mockResolvedValueOnce({ rows: [row] });

      const repo = specializationsRepository(db);
      const out = await repo.update("s3", { name: "Dermatology", description: "Skin" });

      expect(out).toEqual(row);
      const [, params] = db.query.mock.calls[0];
      expect(params).toEqual(["Dermatology", "Skin", "s3"]); // $1 name, $2 desc, $3 id
    });

    it("falls back to findById when patch is empty", async () => {
      const db = makeDb();
      const repo = specializationsRepository(db);

      const spy = jest
        .spyOn(repo as any, "findById")
        .mockResolvedValueOnce({ id: "s1", name: "Cardiology", description: null });
      const out = await repo.update("s1", {});
      expect(spy).toHaveBeenCalledWith("s1");
      expect(out).toEqual({ id: "s1", name: "Cardiology", description: null });
      spy.mockRestore();
    });
  });

  describe("remove", () => {
    it("returns true when a row is deleted", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rowCount: 1 });

      const repo = specializationsRepository(db);
      const ok = await repo.remove("s1");

      expect(ok).toBe(true);
      const [, params] = db.query.mock.calls[0];
      expect(params).toEqual(["s1"]);
    });

    it("returns false when nothing deleted", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rowCount: 0 });

      const repo = specializationsRepository(db);
      const ok = await repo.remove("sX");
      expect(ok).toBe(false);
    });
  });

  describe("findById", () => {
    it("returns row when found", async () => {
      const db = makeDb();
      const row = { id: "s1", name: "Cardiology", description: null };
      db.query.mockResolvedValueOnce({ rows: [row] });

      const repo = specializationsRepository(db);
      const out = await repo.findById("s1");
      expect(out).toEqual(row);
    });

    it("returns null when not found", async () => {
      const db = makeDb();
      db.query.mockResolvedValueOnce({ rows: [] });

      const repo = specializationsRepository(db);
      const out = await repo.findById("nope");
      expect(out).toBeNull();
    });
  });
});
