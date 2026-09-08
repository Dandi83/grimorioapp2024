import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "grimorio_admin";

function getSecret(): string {
  return process.env.ADMIN_PASSCODE || "";
}

/** Deterministic token derived from the passcode; rotates automatically if the passcode changes. */
function expectedToken(): string {
  const secret = getSecret();
  return createHmac("sha256", secret).update("grimorio-admin-session").digest("hex");
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
  return safeEqual(token, expectedToken());
}

export async function startAdminSession(): Promise<void> {
  const store = await cookies();
  const isDev = process.env.NODE_ENV !== "production";
  store.set(COOKIE_NAME, expectedToken(), {
    httpOnly: true,
    // In sviluppo l'app gira in un iframe cross-site (preview v0): serve
    // sameSite:"none" + secure altrimenti il browser scarta il cookie.
    sameSite: isDev ? "none" : "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 giorni
  });
}

export async function endAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
