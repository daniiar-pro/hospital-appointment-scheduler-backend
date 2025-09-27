import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function tableRe(name: string) {
  return new RegExp(`CREATE\\s+TABLE\\s+(IF\\s+NOT\\s+EXISTS\\s+)?${name}\\b`, "i");
}

describe("SQL migrations (assets only)", () => {
  const dir = join(process.cwd(), "src", "database", "migrations");

  it("has the expected files in order", () => {
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    expect(files).toEqual([
      "00_extensions.sql",
      "01_types.sql",
      "02_tables.sql",
      "03_constraints.sql",
      "04_indexes.sql",
      "05_seed.sql",
      "06_refresh_tokens_meta.sql",
      "07_doctor_specializations_unique.sql",
    ]);
  });

  it("includes key definitions in the right files", () => {
    const read = (name: string) => readFileSync(join(dir, name), "utf8");

    const types = read("01_types.sql");
    expect(types).toMatch(/CREATE\s+TYPE\s+user_role/i);
    expect(types).toMatch(/CREATE\s+TYPE\s+appointment_status/i);

    const tables = read("02_tables.sql");
    expect(tables).toMatch(tableRe("users"));
    expect(tables).toMatch(tableRe("specializations"));
    expect(tables).toMatch(tableRe("doctor_specializations"));
    expect(tables).toMatch(tableRe("weekly_availability"));
    expect(tables).toMatch(tableRe("slot_exceptions"));
    expect(tables).toMatch(tableRe("availability_slots"));
    expect(tables).toMatch(tableRe("appointments"));
    expect(tables).toMatch(tableRe("refresh_tokens"));

    expect(read("05_seed.sql")).toMatch(/INSERT\s+INTO\s+specializations/i);
  });
});
