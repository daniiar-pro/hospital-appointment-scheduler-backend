import { readFileSync } from "fs";
import { join } from "path";
import { createDatabase } from "../index";
import { config } from "../../config";

const files = [
  "00_extensions.sql",
  "01_types.sql",
  "02_tables.sql",
  "03_constraints.sql",
  "04_indexes.sql",
  "05_seed.sql",
];

async function run() {
  const db = createDatabase({ connectionString: config.DATABASE_URL });

  try {
    await db.query("BEGIN");
    for (const f of files) {
      const sql = readFileSync(
        join(process.cwd(), "src/database/migrations", f),
        "utf8"
      );
      console.log(`[migrate] ${f}`);
      await db.query(sql);
    }
    await db.query("COMMIT");
    console.log("[migrate] done");
  } catch (e) {
    await db.query("ROLLBACK");
    console.error("[migrate] failed:", e);
    process.exit(1);
  } finally {
    await db.close();
  }
}
run();
