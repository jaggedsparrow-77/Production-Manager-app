import { defineConfig } from "drizzle-kit";

import { loadEnvLocal } from "./src/db/load-env";

// drizzle-kit runs outside Next.js, so it loads env itself rather than going
// through src/env.ts (which pulls in server-only modules).
loadEnvLocal();

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
