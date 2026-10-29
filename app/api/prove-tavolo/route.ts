import { NextRequest, NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { communityPublic } from "@/lib/community";
import { getHomebrew } from "@/lib/homebrew";
import { effectiveHidden, partId } from "@/lib/public-sections";
import { visibilityState } from "@/lib/section-visibility";
import { readPublicTableCounts, TABLE_THRESHOLD } from "@/lib/table-votes";

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" };

/**
 * «L'hai provato al tavolo?» (PROMPT 19): the votes of one card of «I mostri creati da voi», only from 5 on (before,
 * counts is null). Public: the counts of the masters, never anything of the Bilanciamento.
 */
/** Like the pages of the section: nothing while it is switched off or hidden, except for the administrator. */
async function open(): Promise<boolean> {
  if (await isAdmin()) return true;
  if (!communityPublic()) return false;
  const state = await visibilityState();
  return !effectiveHidden(state.sections, state.parts).includes("bestiario") && !state.parts.includes(partId("bestiario", "homebrew"));
}

export async function GET(request: NextRequest) {
  if (!(await open().catch(() => false))) return NextResponse.json({ error: "Non disponibile." }, { status: 404, headers: HEADERS });
  const id = request.nextUrl.searchParams.get("id") || "";
  if (!/^[a-z0-9][a-z0-9-]{0,119}$/.test(id) || !(await getHomebrew(id).catch(() => undefined)))
    return NextResponse.json({ error: "Scheda non valida" }, { status: 404, headers: HEADERS });
  const counts = await readPublicTableCounts(id).catch(() => null);
  return NextResponse.json({ threshold: TABLE_THRESHOLD, counts }, { headers: HEADERS });
}
