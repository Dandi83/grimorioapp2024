import { publishedHomebrew, homebrewLicense, verifiedPill } from "@/lib/homebrew";
import { cardPath, publicVisibilityState } from "@/lib/section-visibility";
import { srdOnlyState } from "@/lib/srd-only";
import { TPK_LIST_CACHE, tpkCreatureList, type TpkSourceRow } from "@/lib/tpk-creatures";

/**
 * PROMPT 66: the original creatures of the Grimorio for Total Party Kill («Evoca dal Grimorio.App», «Mostro della
 * settimana»), read by its server. Only GET (the other methods: 405 from Next.js), read only, no CORS. Built at every
 * request and kept by the network cache for an hour (then served stale for a day while a new copy is made): no ISR
 * timer, nothing written in the database. The rules of what goes out are in lib/tpk-creatures.ts.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  let body;
  try {
    const [rows, state, srdOnly] = await Promise.all([publishedHomebrew(), publicVisibilityState(), srdOnlyState()]);
    const hidden = new Set(state.cards);
    // Field by field: what the card already shows, never the proposal, the saved verdict or the internal columns.
    const sources: TpkSourceRow[] = rows.map(row => ({
      id: row.id, scheda: row.scheda, edizione: row.edizione, autore: row.autore, licenza: homebrewLicense(row),
      verificato: verifiedPill(row), pubblicata_il: row.pubblicata_il, aggiornata_il: row.aggiornata_il,
    }));
    body = tpkCreatureList(sources, { sections: state.sections, parts: state.parts, cardHidden: id => hidden.has(cardPath("mostro", id)), srdOnly: srdOnly.attiva });
  } catch {
    // Never a list made without knowing what is hidden: TPK keeps the copy it has.
    return Response.json({ errore: "Elenco non disponibile, riprova più tardi." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json(body, { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": TPK_LIST_CACHE } });
}
