"use server";

import { cookies } from "next/headers";

import { requireAdmin } from "@/lib/admin-action-helpers";
import { ADMIN_EDITION_COOKIE, isAdminEdition } from "@/lib/admin-edition";

/** Remembers the edition of the admin area (only for the administrator: the cookie is set after the login check). */
export async function setAdminEditionAction(edition: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (!isAdminEdition(edition)) return { ok: false };
  const isDev = process.env.NODE_ENV !== "production";
  (await cookies()).set(ADMIN_EDITION_COOKIE, edition, {
    httpOnly: true, secure: true, path: "/", sameSite: isDev ? "none" : "strict", maxAge: 365 * 24 * 3600,
  });
  return { ok: true };
}
