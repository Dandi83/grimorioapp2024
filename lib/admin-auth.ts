import { cookies } from "next/headers";

import { ADMIN_HINT_COOKIE } from "./admin-edit-link";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { pool } from "./db";

/** The __Host- prefix: the browser accepts it only from this exact site, over HTTPS, for every path. */
export const COOKIE_NAME = "__Host-grimorio_admin";
const SESSION_DAYS = 7;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

function getSecret(): string {
  return process.env.ADMIN_PASSCODE || "";
}

/**
 * Signs expiry and session id: the session ends on the server after 7 days, every session
 * ends if the passcode changes, and logout deletes the id so the cookie stops working at once.
 */
function signature(expiresAt: number, id: string): string {
  return createHmac("sha256", getSecret()).update(`grimorio-admin-session:v3:${expiresAt}:${id}`).digest("hex");
}

export function createSessionToken(now = Date.now(), id = randomBytes(18).toString("hex")): string {
  const expiresAt = now + SESSION_MS;
  return `v3.${expiresAt}.${id}.${signature(expiresAt, id)}`;
}

/** The session id of a well-formed, correctly signed and unexpired token; null otherwise. */
export function verifySessionToken(token: string, now = Date.now()): string | null {
  const [version, expiry, id, signed, ...rest] = token.split(".");
  if (version !== "v3" || !signed || rest.length || !/^\d{1,15}$/.test(expiry ?? "") || !/^[0-9a-f]{36}$/.test(id ?? "")) return null;
  const expiresAt = Number(expiry);
  if (expiresAt <= now || expiresAt > now + SESSION_MS) return null;
  return safeEqual(signed, signature(expiresAt, id)) ? id : null;
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function passcodeConfigured(): boolean {
  return getSecret().length > 0;
}

export function verifyPasscode(input: string): boolean {
  const secret = getSecret();
  if (!secret) return false;
  return safeEqual(input, secret);
}

let tableReady: Promise<void> | undefined;
/** Additive migration: open admin sessions, created on first use. */
function ensureTable() {
  if (!tableReady) tableReady = pool.query(`CREATE TABLE IF NOT EXISTS grimorio_admin_sessions (
    id text PRIMARY KEY,
    expires_at timestamptz NOT NULL
  )`).then(() => undefined).catch(error => { tableReady = undefined; throw error; });
  return tableReady;
}

/** Without a readable session list the admin area stays closed (fail closed). */
async function sessionOpen(id: string): Promise<boolean> {
  try {
    await ensureTable();
    const { rows } = await pool.query("SELECT 1 FROM grimorio_admin_sessions WHERE id = $1 AND expires_at > now()", [id]);
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function isAdmin(): Promise<boolean> {
  if (!passcodeConfigured()) return false;
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const id = verifySessionToken(token);
  return id !== null && (await sessionOpen(id));
}

export async function startAdminSession(): Promise<void> {
  await ensureTable();
  const token = createSessionToken();
  const [, expiry, id] = token.split(".");
  await pool.query("INSERT INTO grimorio_admin_sessions (id, expires_at) VALUES ($1, to_timestamp($2::bigint / 1000.0))", [id, expiry]);
  await pool.query("DELETE FROM grimorio_admin_sessions WHERE expires_at < now()");
  const store = await cookies();
  const isDev = process.env.NODE_ENV !== "production";
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    // In sviluppo l'app gira in un iframe cross-site (preview v0): serve
    // sameSite:"none" + secure altrimenti il browser scarta il cookie.
    // In produzione "strict": nessun altro sito può far partire richieste con la sessione.
    sameSite: isDev ? "none" : "strict",
    secure: true,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  // Readable by the page, grants nothing: the public pages ask the server for the «Modifica» buttons only when it is there.
  store.set(ADMIN_HINT_COOKIE, "1", { httpOnly: false, sameSite: isDev ? "none" : "strict", secure: true, path: "/", maxAge: SESSION_DAYS * 24 * 60 * 60 });
}

/** Logout: the session id is deleted on the server, so a copied cookie no longer works either. */
export async function endAdminSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  const id = token ? verifySessionToken(token) : null;
  if (id) {
    await ensureTable();
    await pool.query("DELETE FROM grimorio_admin_sessions WHERE id = $1", [id]);
  }
  store.delete({ name: COOKIE_NAME, path: "/", secure: true });
  // Cookie of the previous version (30-day sessions): removed too.
  store.delete("grimorio_admin");
  store.delete({ name: ADMIN_HINT_COOKIE, path: "/", secure: true });
}
