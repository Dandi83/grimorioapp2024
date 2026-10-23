import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { adminBadgeCount } from "@/lib/admin-badge";

export const dynamic = "force-dynamic";

/** The number for the app icon badge: new reports and proposals to review, administrator only (components/app-badge-sync.tsx). */
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorizzato" }, { status: 401, headers });
  try {
    return NextResponse.json({ count: await adminBadgeCount() }, { headers });
  } catch {
    return NextResponse.json({ error: "Non disponibile" }, { status: 503, headers });
  }
}
