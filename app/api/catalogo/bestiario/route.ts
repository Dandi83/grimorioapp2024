import { NextResponse } from "next/server";

import { getMonsterListIndex } from "@/lib/monster-index";
import { sectionsOut, visibleCards } from "@/lib/section-view";

export const dynamic = "force-dynamic";

/** The creature list of the computer layout (see app/api/catalogo/incantesimi/route.ts). Same data as /bestiario. */
export async function GET() {
  if ((await sectionsOut()).includes("bestiario")) return NextResponse.json({ error: "Sezione non disponibile" }, { status: 404 });
  return NextResponse.json({ monsters: await visibleCards("mostro", await getMonsterListIndex()) }, { headers: { "Cache-Control": "private, no-store" } });
}
