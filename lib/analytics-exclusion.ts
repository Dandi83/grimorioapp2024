import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { analyticsSecret, excludeVisitor, isVisitorExcluded } from "./analytics";

/**
 * The devices of the administrator never count in the statistics, also after the logout and in the app installed
 * from the icon (on iPhone it has its own cookies, apart from Safari). Two marks, either one is enough:
 * - the cookie EXCLUDED, set at every admin login, by «Non contare questo dispositivo» (/admin/statistiche) and
 *   renewed at every visit, so it lasts while the device is used (browsers keep a cookie at most 400 days);
 * - the visitor ID of the device in grimorio_analytics_excluded (lib/analytics.ts), when it has one: if the cookie
 *   is lost, the same visitor is still refused. Its events already saved are deleted.
 */
export const CONSENT_COOKIE = "grimorio_statistics_consent";
export const VISITOR_COOKIE = "grimorio_statistics_visitor";
export const EXCLUDED_COOKIE = "grimorio_statistics_excluded";

export const COOKIE_OPTIONS = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 180 };
/** 400 days: the longest a browser keeps a cookie; renewed at every visit. */
export const EXCLUDED_OPTIONS = { ...COOKIE_OPTIONS, maxAge: 60 * 60 * 24 * 400 };

// ANALYTICS_SECRET signs the visitor IDs. A cookie that does not verify (also one signed earlier with the admin
// passcode) is simply a new visitor.
export function signVisitor(id: string) {
  const secret = analyticsSecret();
  if (!secret) throw new Error("ANALYTICS_SECRET missing");
  return createHmac("sha256", secret).update(`statistics:${id}`).digest("hex");
}

/** The visitor ID of a signed cookie value, or undefined when it does not verify. */
export function visitorOf(value: string | undefined): string | undefined {
  const [id, signature] = value?.split(".") ?? [];
  if (!id || !signature || !/^[0-9a-f-]{36}$/i.test(id) || !analyticsSecret()) return;
  const a = Buffer.from(signature), b = Buffer.from(signVisitor(id));
  if (a.length === b.length && timingSafeEqual(a, b)) return id;
}

/** This device is marked as the administrator's (by its cookie). */
export async function deviceExcluded(): Promise<boolean> {
  return (await cookies()).get(EXCLUDED_COOKIE)?.value === "1";
}

/**
 * Marks the device of this request as the administrator's: the cookie, and its visitor ID if it has one.
 * From a server action or a route handler only (cookies can be written there).
 */
export async function excludeThisDevice(): Promise<void> {
  const jar = await cookies();
  jar.set(EXCLUDED_COOKIE, "1", EXCLUDED_OPTIONS);
  const visitor = visitorOf(jar.get(VISITOR_COOKIE)?.value);
  if (visitor) await excludeVisitor(visitor);
}

/** A visitor ID already marked as the administrator's, from any device. */
export async function visitorExcluded(visitor: string): Promise<boolean> {
  return isVisitorExcluded(visitor).catch(() => false);
}
