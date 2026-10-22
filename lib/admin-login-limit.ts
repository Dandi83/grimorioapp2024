import "server-only";
import { createHash } from "node:crypto";
import { pool } from "./db";

/** At most 5 wrong passcodes per address in 15 minutes, and 100 overall in an hour. */
export const LOGIN_LIMITS = { perAddress: 5, addressWindowMinutes: 15, overall: 100, overallWindowMinutes: 60 } as const;

let tableReady: Promise<void> | undefined;
function ensureTable() {
  if (!tableReady) tableReady = pool.query(`CREATE TABLE IF NOT EXISTS grimorio_admin_login_failures (
    address_hash text NOT NULL,
    failed_at timestamptz NOT NULL DEFAULT now()
  )`).then(() => undefined).catch(error => { tableReady = undefined; throw error; });
  return tableReady;
}

/**
 * The visitor's address as Vercel reports it. Vercel sets x-real-ip and overwrites x-forwarded-for
 * with the real client address, so a visitor cannot pick another one by sending these headers.
 */
export function clientAddress(headers: { get(name: string): string | null }): string | null {
  return headers.get("x-real-ip")?.trim() || headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}

/** Addresses are stored only as a hash. */
export function addressKey(address: string | null): string {
  address = address?.split(",")[0]?.trim() || "unknown";
  return createHash("sha256").update(`grimorio-admin-login:${address}`).digest("hex");
}

/** Throws when the database is unavailable: callers must refuse the login (fail closed). */
export async function loginBlocked(key: string): Promise<boolean> {
  await ensureTable();
  const { rows } = await pool.query<{ address: number; overall: number }>(
    `SELECT count(*) FILTER (WHERE address_hash = $1 AND failed_at > now() - make_interval(mins => $2))::int AS address,
            count(*) FILTER (WHERE failed_at > now() - make_interval(mins => $3))::int AS overall
     FROM grimorio_admin_login_failures`,
    [key, LOGIN_LIMITS.addressWindowMinutes, LOGIN_LIMITS.overallWindowMinutes],
  );
  return rows[0].address >= LOGIN_LIMITS.perAddress || rows[0].overall >= LOGIN_LIMITS.overall;
}

export async function recordLoginFailure(key: string): Promise<void> {
  await ensureTable();
  await pool.query("INSERT INTO grimorio_admin_login_failures (address_hash) VALUES ($1)", [key]);
  await pool.query("DELETE FROM grimorio_admin_login_failures WHERE failed_at < now() - interval '1 day'");
}

export async function clearLoginFailures(key: string): Promise<void> {
  await ensureTable();
  await pool.query("DELETE FROM grimorio_admin_login_failures WHERE address_hash = $1", [key]);
}
