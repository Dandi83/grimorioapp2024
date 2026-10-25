import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-action-helpers";
import { noSrdIds } from "@/lib/no-srd";

export const dynamic = "force-dynamic";

const PRIVATE = { "Cache-Control": "private, no-store" };

/**
 * The ids of the NO SRD spells and creatures, for the asterisk of the lists: administrator only (401 otherwise),
 * never stored by a browser or a cache. The lists ask for it only after /api/admin/sessione said yes.
 */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401, headers: PRIVATE });
  }
  return NextResponse.json(await noSrdIds(), { headers: PRIVATE });
}
