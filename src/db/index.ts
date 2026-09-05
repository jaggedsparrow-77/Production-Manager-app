import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/env";
import * as schema from "./schema";

/**
 * Next.js hot-reload re-evaluates modules on every edit. Without this cache
 * each reload would open a fresh pool and exhaust Postgres connections within
 * a few minutes of development.
 */
const globalForDb = globalThis as unknown as {
  client: ReturnType<typeof postgres> | undefined;
};

const client =
  globalForDb.client ??
  postgres(env.DATABASE_URL, {
    max: env.NODE_ENV === "production" ? 10 : 5,
    idle_timeout: 20,
  });

if (env.NODE_ENV !== "production") globalForDb.client = client;

export const db = drizzle(client, { schema });

export { schema };
export type Database = typeof db;
