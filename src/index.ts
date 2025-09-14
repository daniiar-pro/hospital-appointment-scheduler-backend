import { buildApp } from "./app.js";
import { CONFIG } from "./config.js";

buildApp().listen(CONFIG.PORT, () =>
  console.log(`Auth API on http://localhost:${CONFIG.PORT}`)
);
