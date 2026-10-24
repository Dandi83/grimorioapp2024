import { NextResponse, type NextRequest } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { ADMIN_EDITION_COOKIE, adminEditionCookieOptions, isAdminEdition } from "@/lib/admin-edition";
import { safeReturnPath } from "@/lib/admin-edit-link";

export const dynamic = "force-dynamic";

/**
 * The editor of a card opened from a public page (?modifica=…) puts the admin area on the card's edition,
 * then goes on to that editor: /admin/edizione?valore=2014&poi=/admin/incantesimi?modifica=…
 * Only for the administrator (the session is checked before the cookie is set) and only to the admin area.
 */
export async function GET(request: NextRequest) {
  const valore = request.nextUrl.searchParams.get("valore");
  const next = safeReturnPath(request.nextUrl.searchParams.get("poi"));
  const target = next && next.startsWith("/admin/") ? next : "/admin";
  // A relative address: always this site, whatever host the server believes it has.
  const response = new NextResponse(null, { status: 303, headers: { Location: target, "Cache-Control": "private, no-store" } });
  if (isAdminEdition(valore) && (await isAdmin())) response.cookies.set(ADMIN_EDITION_COOKIE, valore, adminEditionCookieOptions());
  return response;
}
