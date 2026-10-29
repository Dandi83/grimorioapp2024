import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { __pool?: Pool };

export const pool =
  globalForDb.__pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // Browser tests only (e2e/run.mjs): the in-memory test database mixes up queries arriving on several connections.
    max: Number(process.env.GRIMORIO_DB_POOL_MAX) || undefined,
  });

if (process.env.NODE_ENV !== "production") globalForDb.__pool = pool;

export const db = drizzle(pool, { schema });
