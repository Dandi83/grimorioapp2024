import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "grimorio_admin";
const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

function getSecret(): string {
  return process.env.ADMIN_PASSCODE || "";
}

/** Signs the expiry: the session ends on the server after 30 days, and every session ends if the passcode changes. */
function signature(expiresAt: number): string {
  return createHmac("sha256", getSecret()).update(`grimorio-admin-session:v2:${expiresAt}`).digest("hex");
}

export function createSessionToken(now = Date.now()): string {
  const expiresAt = now + SESSION_MS;
  return `v2.${expiresAt}.${signature(expiresAt)}`;
}

export function verifySessionToken(token: string, now = Date.now()): boolean {
  const [version, expiry, signed, ...rest] = token.split(".");
  if (version !== "v2" || !signed || rest.length || !/^\d{1,15}$/.test(expiry ?? "")) return false;
  const expiresAt = Number(expiry);
  if (expiresAt <= now || expiresAt > now + SESSION_MS) return false;
  return safeEqual(signed, signature(expiresAt));
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function passcodeConfigured(): boolean {
  return getSecret().length > 0;
}

export function verifyPasscode(input: string): boolean {
  const secret = getSecret();
  if (!secret) return false;
  return safeEqual(input, secret);
}

export async function isAdmin(): Promise<boolean> {
  if (!passcodeConfigured()) return false;
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}

export async function startAdminSession(): Promise<void> {
  const store = await cookies();
  const isDev = process.env.NODE_ENV !== "production";
  store.set(COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    // In sviluppo l'app gira in un iframe cross-site (preview v0): serve
    // sameSite:"none" + secure altrimenti il browser scarta il cookie.
    sameSite: isDev ? "none" : "lax",
    secure: true,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function endAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
