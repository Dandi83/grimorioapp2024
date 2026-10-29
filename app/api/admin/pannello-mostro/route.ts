import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-action-helpers";
import { getMonsterById } from "@/lib/monsters";
import { parseGs } from "@/lib/monsters-types";
import { balanceApplies, balanceBoxHtml, balanceEdition, evaluateMonster, NOT_FOR_OFFICIAL, type BalanceEdition } from "@/lib/monster-balance";
import { usesLegacyMonsterRules } from "@/lib/srd-monsters";

export const dynamic = "force-dynamic";

const PRIVATE = { "Cache-Control": "private, no-store" };
const denied = () => NextResponse.json({ error: "Non autorizzato" }, { status: 401, headers: PRIVATE });

/**
 * The box of the administrator under a monster sheet (PROMPT 11): drawn here, on the server, and sent only after the
 * session check, never stored by a browser or a cache. GET ?id=: a homebrew or a sheet made here (PROMPT 12: never an official one) (the public page
 * asks for it after /api/admin/sessione said yes). Read only: nothing is written.
 */
export async function GET(request: NextRequest) {
  try { await requireAdmin(); } catch { return denied(); }
  const id = request.nextUrl.searchParams.get("id") || "";
  if (!/^[a-z0-9][a-z0-9-]{0,119}$/.test(id)) return NextResponse.json({ error: "Scheda non valida" }, { status: 400, headers: PRIVATE });
  const monster = await getMonsterById(id);
  if (!monster) return NextResponse.json({ error: "Scheda non trovata" }, { status: 404, headers: PRIVATE });
  // The official sheets (SRD, its animals, NO SRD from a manual) are only the reference group: nothing is computed.
  if (!balanceApplies(monster)) return NextResponse.json({ error: NOT_FOR_OFFICIAL }, { status: 422, headers: PRIVATE });
  const result = evaluateMonster(monster, balanceEdition(monster, usesLegacyMonsterRules(monster)));
  return NextResponse.json({ html: balanceBoxHtml(result) }, { headers: PRIVATE });
}

/** POST: the sheet being written in the editor («Ricalcola»), with its edition; nothing is saved. */
export async function POST(request: NextRequest) {
  // The same site only (the host the browser asked for: Next writes 127.0.0.1 as «localhost» in nextUrl).
  const origin = request.headers.get("origin");
  let sameSite = false;
  try { sameSite = !!origin && new URL(origin).host === (request.headers.get("host") || request.nextUrl.host); } catch {}
  if (!sameSite) return NextResponse.json({ error: "Origine non valida" }, { status: 403, headers: PRIVATE });
  try { await requireAdmin(); } catch { return denied(); }
  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 200_000) return NextResponse.json({ error: "Scheda troppo grande" }, { status: 413, headers: PRIVATE });
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400, headers: PRIVATE });
  }
  const text = (key: string) => (typeof body[key] === "string" ? (body[key] as string) : "");
  const score = (key: string) => Number(body[key]) || 10;
  const edition: BalanceEdition = text("edizione") === "2014" ? "2014" : "2024";
  const sheet = {
    nome: text("nome") || "Senza nome", gs_num: parseGs(text("grado_sfida")), classe_armatura: text("classe_armatura"), punti_ferita: text("punti_ferita"),
    tiri_salvezza: text("tiri_salvezza"), forza: score("forza"), destrezza: score("destrezza"), costituzione: score("costituzione"),
    intelligenza: score("intelligenza"), saggezza: score("saggezza"), carisma: score("carisma"), resistenze: text("resistenze"),
    immunita_danni: text("immunita_danni"), immunita: text("immunita"), tratti: text("tratti"), azioni: text("azioni"),
    azioni_bonus: text("azioni_bonus"), azioni_leggendarie: text("azioni_leggendarie"),
  };
  return NextResponse.json({ html: balanceBoxHtml(evaluateMonster(sheet, edition)) }, { headers: PRIVATE });
}
