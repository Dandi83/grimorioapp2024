import { NextResponse, type NextRequest } from "next/server";

import { requireAdmin } from "@/lib/admin-action-helpers";
import { readAdminSummary } from "@/lib/admin-summary";
import { readNow } from "@/lib/analytics";

export const dynamic = "force-dynamic";

const PRIVATE = { "Cache-Control": "private, no-store" };

/**
 * The strip of the Home for the administrator (PROMPT 18): asked by the browser after the page, only once
 * /api/admin/sessione said yes; 401 otherwise, never stored by a browser or a cache. ?adesso=1: «adesso» only (every 30 s).
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401, headers: PRIVATE });
  }
  if (request.nextUrl.searchParams.get("adesso") === "1") return NextResponse.json({ adesso: await readNow() }, { headers: PRIVATE });
  return NextResponse.json(await readAdminSummary(), { headers: PRIVATE });
}
