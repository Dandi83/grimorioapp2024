import { pictureSrc } from "@/components/monster-picture";
import { EDITORIAL_SECTIONS, HOMEBREW_LICENSE_URL, type HomebrewDraft, type HomebrewEdition, type HomebrewEntry } from "./homebrew-types";
import { collectionOf } from "./monsters-types";
import { effectiveHidden, partId } from "./public-sections";
import { publicSheet } from "./public-sheet";
import { SITE_URL } from "./seo";

/**
 * PROMPT 66: the public list of the original creatures that Total Party Kill reads from its server
 * (GET /api/tpk/creature-originali, app/api/tpk/creature-originali/route.ts) for «Evoca dal Grimorio.App» and
 * «Mostro della settimana». Pure rules, no database: the route reads the rows and the visibility, this file decides
 * what goes out, so the unit test (tests/api-tpk-creature.cjs) checks the same code as the endpoint.
 *
 * Only what the public already sees on /mostro/<id>, with the same checks (app/mostro/[id]/page.tsx): Bestiario shown,
 * the part of the creature («Mostri del Grimorio» / «I mostri creati da voi») shown, the 2024 edition shown, the card
 * not hidden with the eye, the sections hidden by the administrator taken away by publicSheet. Stricter than the page:
 * never a 2014 creature, never a creature of the community without a licence accepted, nothing at all while the
 * «Modalità solo SRD» is on. Every field is copied by name: a key added to the stored draft never goes out by itself.
 */

export const TPK_LIST_VERSION = 1;
export const TPK_LIST_PATH = "/api/tpk/creature-originali";
export const TPK_LIST_CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";
export const TPK_LICENSE_NOTE = "Le creature della community sono CC BY-NC-SA 4.0: uso solo non commerciale, con autore, licenza e link alla scheda. Se Total Party Kill diventasse a pagamento o con pubblicità, vanno tolte o serve un consenso diverso.";
/** The creatures of the editorial staff: their own licence for TPK, not the CC one of the site. */
export const TPK_EDITORIAL_LICENSE = "© 2026 D.d.B. – Il Grimorio.App, uso consentito a Total Party Kill";
export const TPK_EDITORIAL_LICENSE_URL = `${SITE_URL}/info`;

/** One published row, as the server reads it (lib/homebrew.ts): already without email, proposal or notes. */
export interface TpkSourceRow {
  id: string;
  scheda: HomebrewDraft;
  edizione: HomebrewEdition;
  /** The nickname shown on the card; null for the editorial staff. */
  autore: string | null;
  /** The licence the card shows (homebrewLicense), null when the author never accepted one. */
  licenza: string | null;
  /** The green pill «Bilanciamento verificato» shown on the card (verifiedPill). */
  verificato: boolean;
  pubblicata_il: Date | string;
  aggiornata_il: Date | string;
}

/** What the public may see now: the visibility state of /admin/sezioni (lib/section-visibility.ts) and the switch. */
export interface TpkVisibility {
  /** Hidden or «In arrivo» sections. */
  sections: readonly string[];
  /** Hidden or «In arrivo» parts ("bestiario:grimorio"), the community switch included (withCommunitySwitch). */
  parts: readonly string[];
  /** True when the card /mostro/<id> is hidden (with the eye, or by the «Modalità solo SRD»). */
  cardHidden: (id: string) => boolean;
  /** «Modalità solo SRD» on: the list is empty. */
  srdOnly: boolean;
}

/** The fields of the sheet, in the order of HomebrewDraft. */
const SHEET_FIELDS = [
  "edizione", "nome", "taglia", "tipo", "allineamento", "ca", "ca_nota", "pf", "dadi_vita", "velocita",
  "forza", "destrezza", "costituzione", "intelligenza", "saggezza", "carisma", "ts_competenti", "abilita", "vulnerabilita", "resistenze",
  "immunita_danni", "immunita_condizioni", "sensi", "linguaggi", "habitat", "grado_sfida",
  "tratti", "azioni", "azioni_bonus", "reazioni", "azioni_leggendarie", "descrizione",
] as const satisfies readonly (keyof HomebrewDraft)[];

type SheetField = (typeof SHEET_FIELDS)[number] | (typeof EDITORIAL_SECTIONS)[number];
export type TpkSheet = Partial<Pick<HomebrewDraft, SheetField>> & { testo_ricco: boolean };

export interface TpkCreature {
  id: string;
  url: string;
  origine: "redazione" | "community";
  autore: string | null;
  licenza: string;
  licenza_url: string;
  verificato: boolean;
  giudizio_bilanciamento: "In linea" | null;
  pubblicata_il: string;
  aggiornata_il: string;
  immagine: { url: string; alt: string; crediti: string | null } | null;
  scheda: TpkSheet;
}

export interface TpkCreatureList {
  versione: typeof TPK_LIST_VERSION;
  generato_il: string;
  fonte: string;
  nota_licenza: string;
  creature: TpkCreature[];
}

const iso = (value: Date | string) => new Date(value).toISOString();
const copyEntries = (list: readonly HomebrewEntry[]) => list.map(entry => ({ nome: entry.nome, testo: entry.testo }));

/** True when the public sees /mostro/<id> of this row now, and it may go to TPK. */
export function tpkVisible(row: Pick<TpkSourceRow, "id" | "edizione" | "autore" | "licenza">, view: TpkVisibility): boolean {
  if (view.srdOnly) return false;
  if (effectiveHidden(view.sections, view.parts).includes("bestiario")) return false;
  // Never 2014; «Entrambe» goes out with its 2024 sheet, so the 2024 edition must be shown.
  if (row.edizione !== "2024" && row.edizione !== "entrambe") return false;
  if (view.parts.includes(partId("bestiario", "2024"))) return false;
  const collection = collectionOf({ id: row.id, homebrew: true, autore: row.autore });
  if (view.parts.includes(partId("bestiario", collection))) return false;
  if (view.cardHidden(row.id)) return false;
  // A creature proposed before the licence: its author never accepted one, so it cannot be given to anyone else.
  if (collection === "homebrew" && !row.licenza) return false;
  return true;
}

/** The sheet as the public sees it: the hidden sections taken away (publicSheet), every other field copied by name. */
export function tpkSheet(draft: HomebrewDraft, editorial: boolean): TpkSheet {
  const shown = publicSheet(draft);
  const sheet: Record<string, unknown> = {};
  for (const key of SHEET_FIELDS) {
    const value = shown[key];
    if (value === undefined) continue;
    sheet[key] = Array.isArray(value) ? (key === "ts_competenti" || key === "habitat" ? [...value] : copyEntries(value as HomebrewEntry[])) : value;
  }
  // The five sections of the editorial staff (PROMPT 44): only theirs, only the ones not hidden.
  if (editorial) for (const key of EDITORIAL_SECTIONS) if (shown[key]?.trim()) sheet[key] = shown[key];
  sheet.testo_ricco = draft.testo_ricco === true;
  return sheet as TpkSheet;
}

export function tpkCreature(row: TpkSourceRow): TpkCreature {
  const editorial = collectionOf({ id: row.id, homebrew: true, autore: row.autore }) === "grimorio";
  const draft = row.scheda;
  const picture = editorial && draft.immagine && draft.immagine_alt
    ? { url: `${SITE_URL}${pictureSrc(draft.immagine.v, "m")}`, alt: draft.immagine_alt, crediti: draft.immagine_crediti || null } : null;
  return {
    id: row.id,
    url: `${SITE_URL}/mostro/${encodeURIComponent(row.id)}`,
    origine: editorial ? "redazione" : "community",
    autore: editorial ? null : row.autore,
    licenza: editorial ? TPK_EDITORIAL_LICENSE : row.licenza!,
    licenza_url: editorial ? TPK_EDITORIAL_LICENSE_URL : HOMEBREW_LICENSE_URL,
    verificato: row.verificato,
    // As on the card: only the pill «Bilanciamento verificato», never the verdict saved for the administrator.
    giudizio_bilanciamento: row.verificato ? "In linea" : null,
    pubblicata_il: iso(row.pubblicata_il),
    aggiornata_il: iso(row.aggiornata_il),
    immagine: picture,
    scheda: tpkSheet(draft, editorial),
  };
}

/** The whole answer: the visible creatures, the most recent first. */
export function tpkCreatureList(rows: readonly TpkSourceRow[], view: TpkVisibility, now: Date = new Date()): TpkCreatureList {
  const creature = rows.filter(row => tpkVisible(row, view))
    .sort((a, b) => new Date(b.pubblicata_il).getTime() - new Date(a.pubblicata_il).getTime() || a.id.localeCompare(b.id))
    .map(tpkCreature);
  return { versione: TPK_LIST_VERSION, generato_il: now.toISOString(), fonte: SITE_URL, nota_licenza: TPK_LICENSE_NOTE, creature };
}
