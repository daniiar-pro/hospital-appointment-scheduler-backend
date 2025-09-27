import "dotenv/config";
import { buildApp } from "./app.js";
import { config } from "./config.js";
import { createDatabase } from "./database/index.js";
import { logger } from "./logger.js";

const db = createDatabase({ connectionString: config.DATABASE_URL });
const app = buildApp(db);

app.listen(config.PORT, () => logger.info(`Auth API on http://localhost:${config.PORT}`));
