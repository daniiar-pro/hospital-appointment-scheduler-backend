const mockQuery = jest.fn().mockResolvedValue({ rows: [{ ok: true }], rowCount: 1 });
const mockEnd = jest.fn().mockResolvedValue(undefined);
const MockPool = jest.fn(() => ({ query: mockQuery, end: mockEnd }));

jest.mock("pg", () => ({
  Pool: MockPool,
}));

describe("database/index createDatabase()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("constructs a Pool and delegates query/close", async () => {
    const { createDatabase } = await import("./index.js");

    const db = createDatabase({ connectionString: "postgres://example" });

    const res = await db.query("SELECT 1", [2]);
    expect(res).toEqual({ rows: [{ ok: true }], rowCount: 1 });

    expect(MockPool).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith("SELECT 1", [2]);

    await db.close();
    expect(mockEnd).toHaveBeenCalled();
  });
});
