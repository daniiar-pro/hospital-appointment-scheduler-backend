import { Client } from "pg";
import { config } from "../config.js"; 

function toAdminConnString(appUrl: string, adminDb = "postgres") {
  const u = new URL(appUrl);
  u.pathname = `/${adminDb}`; 
  return u.toString();
}

function getAppDbName(appUrl: string) {
  const u = new URL(appUrl);
  return u.pathname.replace(/^\//, "") || "hospital_app";
}

async function main() {
  const appDbName = getAppDbName(config.DATABASE_URL); // "hospital_app"
  const adminConn = toAdminConnString(config.DATABASE_URL, "postgres");

  const admin = new Client({ connectionString: adminConn });
  await admin.connect();

  await admin.query(`DROP DATABASE IF EXISTS "${appDbName}" WITH (FORCE)`);
  console.log(`[drop-db] dropped database ${appDbName}`);

  await admin.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
