import { Client } from "pg";
import { config } from "../config.js";

function deriveAdminUrlFromAppUrl(appUrlStr: string): {
  adminUrl: string;
  appDbName: string;
} {
  const u = new URL(appUrlStr);
  const appDbName = decodeURIComponent(u.pathname.replace(/^\/+/, "") || "postgres");
  const admin = new URL(u.toString());
  admin.pathname = "/postgres";
  return { adminUrl: admin.toString(), appDbName };
}

async function main() {
  const { adminUrl, appDbName } = deriveAdminUrlFromAppUrl(config.DATABASE_URL);

  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${appDbName}"`);
    console.log(`[create-db] created database ${appDbName}`);
  } catch (e: any) {
    if (e.code === "42P04") {
      console.log(`[create-db] database ${appDbName} already exists`);
    } else {
      console.error("[create-db] failed:", e);
      process.exit(1);
    }
  } finally {
    await admin.end();
  }
}

main();
