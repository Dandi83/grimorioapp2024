import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * Whether this browser holds a valid admin session: the public pages draw the «Modifica» buttons only
 * after this answer (components/admin-edit), so they never enter the cached pages or the offline copies.
 */
export async function GET() {
  return NextResponse.json({ admin: await isAdmin() }, { headers: { "Cache-Control": "private, no-store" } });
}
