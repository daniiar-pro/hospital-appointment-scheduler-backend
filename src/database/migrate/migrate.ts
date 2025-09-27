import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createDatabase } from "../index.js";
import { config } from "../../config.js";

const files = [
  "00_extensions.sql",
  "01_types.sql",
  "02_tables.sql",
  "03_constraints.sql",
  "04_indexes.sql",
  "05_seed.sql",
  "06_refresh_tokens_meta.sql",
  "07_doctor_specializations_unique.sql",
];

function resolveMigrationsDir(): string {
  // 1) Prefer migrations sitting *next to* this file (works in both src & dist)
  const here = dirname(fileURLToPath(import.meta.url));              // .../src/database/migrate OR .../dist/database/migrate
  const nearMe = join(here, "../migrations");                        // .../src/database/migrations OR .../dist/database/migrations
  if (existsSync(nearMe)) return nearMe;

  // 2) Fallbacks for safety
  const dist = join(process.cwd(), "dist/database/migrations");
  if (existsSync(dist)) return dist;

  const src = join(process.cwd(), "src/database/migrations");
  if (existsSync(src)) return src;

  throw new Error(
    `Cannot locate migrations directory. Tried:\n- ${nearMe}\n- ${dist}\n- ${src}`
  );
}

async function run() {
  const db = createDatabase({ connectionString: config.DATABASE_URL });
  const dir = resolveMigrationsDir();

  try {
    await db.query("BEGIN");
    for (const f of files) {
      const fullPath = join(dir, f);
      const sql = readFileSync(fullPath, "utf8");
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


// import { readFileSync } from "fs";
// import { join } from "path";
// import { createDatabase } from "../index.js";
// import { config } from "../../config.js";

// const files = [
//   "00_extensions.sql",
//   "01_types.sql",
//   "02_tables.sql",
//   "03_constraints.sql",
//   "04_indexes.sql",
//   "05_seed.sql",
//   "06_refresh_tokens_meta.sql",
//   "07_doctor_specializations_unique.sql",
// ];

// async function run() {
//   const db = createDatabase({ connectionString: config.DATABASE_URL });

//   try {
//     await db.query("BEGIN");
//     for (const f of files) {
//       const sql = readFileSync(join(process.cwd(), "src/database/migrations", f), "utf8");
//       console.log(`[migrate] ${f}`);
//       await db.query(sql);
//     }
//     await db.query("COMMIT");
//     console.log("[migrate] done");
//   } catch (e) {
//     await db.query("ROLLBACK");
//     console.error("[migrate] failed:", e);
//     process.exit(1);
//   } finally {
//     await db.close();
//   }
// }
// run();
