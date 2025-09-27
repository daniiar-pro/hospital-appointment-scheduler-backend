import "dotenv/config";
import { createDatabase } from "./index.js";
import { hashPassword } from "../libs/jwt/password.js";

const {
  DATABASE_URL,
  ADMIN_EMAIL = "admin@gmail.com",
  ADMIN_PASSWORD = "ChangeIt1234!",
} = process.env;

async function main() {
  if (!DATABASE_URL) {
    console.error("DATABASE_URL is required!");
    process.exit(1);
  }

  const db = createDatabase({ connectionString: DATABASE_URL });

  try {
    const { rows } = await db.query<{ id: string }>(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [ADMIN_EMAIL],
    );

    if (rows[0]) {
      console.log(`[seed-admin] admin already exists: ${ADMIN_EMAIL}`);
      return;
    }

    const passwordHash = await hashPassword(ADMIN_PASSWORD);

    const queryText = `
        INSERT INTO users (username, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id
    `;

    const insert = await db.query(queryText, ["Admin", ADMIN_EMAIL, passwordHash, "admin"]);
    console.log(`[seed-admin] created admin ${ADMIN_EMAIL} (id: ${insert.rows[0].id})`);
  } catch (error) {
    console.error(`[seed-admin] failed: ${error}`);
    process.exit(1);
  } finally {
    await db.close();
  }
}

main();
