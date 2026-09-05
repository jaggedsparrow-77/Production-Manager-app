/**
 * Applies pending SQL migrations from ./drizzle.
 *
 * Runs as a standalone script (`npm run db:migrate`), so it opens its own
 * single-use connection rather than importing the app's pooled client — that
 * module is marked `server-only` and belongs to the request path.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { loadEnvLocal } from "./load-env";

loadEnvLocal();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  process.exit(1);
}

// max: 1 — migrations must run serially on a single connection.
const client = postgres(url, { max: 1 });

try {
  console.log("Applying migrations…");
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  console.log("Migrations up to date.");
} catch (error) {
  console.error("Migration failed:", error);
  process.exitCode = 1;
} finally {
  await client.end();
}
