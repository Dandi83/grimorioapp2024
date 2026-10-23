import { NextResponse } from "next/server";

import { sectionsOut, visibleCards } from "@/lib/section-view";
import { getSpellIndex } from "@/lib/spell-index";
import { computeMeta } from "@/lib/spells-types";

export const dynamic = "force-dynamic";

/**
 * The spell list of the computer layout (components/layout/catalog-split.tsx): asked by the browser only
 * at ≥1024 px, so a phone opening a card never downloads the whole list. Same data as /grimorio.
 */
export async function GET() {
  if ((await sectionsOut()).includes("incantesimi")) return NextResponse.json({ error: "Sezione non disponibile" }, { status: 404 });
  const spells = await visibleCards("incantesimo", await getSpellIndex());
  return NextResponse.json({ spells, meta: computeMeta(spells) }, { headers: { "Cache-Control": "private, no-store" } });
}
