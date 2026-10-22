// Magic items A–Z of the Italian SRD 5.2.1 (2024) and SRD 5.1 (2014), read on the server only.
// Transcribed by scripts/transcribe-srd-magic-items.py; the item texts never reach the browser code.
import data2014 from "./data/srd-magic-items-5.1-it.json";
import data2024 from "./data/srd-magic-items-5.2.1-it.json";
import repairs from "./data/magic-items-repairs-20261021.json";
import { manualAvailable } from "./manual";
import { rarityCategories, type MagicItemEdition, type MagicItemListRow, type MagicItemType } from "./magic-items-types";

/** Text with *italic*, **bold** and \* for a printed asterisk. */
export type MagicItemBlock =
  | { kind: "p" | "li"; label?: string; text: string; page: number }
  | { kind: "table"; title: string | null; header: string[]; rows: string[][]; notes?: string[]; page: number;
      /** Rows of the left half when the table is printed in two halves side by side. */
      affiancata?: number;
      /** Times the header is printed (again at the top of the next column). */
      intestazioniStampate?: number }
  | { kind: "statblock"; lines: string[]; page: number };

export interface MagicItem {
  id: string;
  /** Name as shown: as printed, or with a display repair of a misprint. */
  nome: string;
  /** Printed name, kept when a display repair changed it ("Armastura demoniaca"). */
  nomeStampato?: string;
  /** Italic type line as printed: "Arma (qualsiasi spada), rara (richiede sintonia)". */
  rigaTipo: string;
  tipo: MagicItemType;
  dettaglioTipo: string | null;
  /** Printed rarity: "rara", "rarità variabile", "non comune (+1), rara (+2) o molto rara (+3)". */
  rarita: string;
  sintonia: boolean;
  /** Printed requirement after "richiede sintonia": "con un incantatore". */
  requisitoSintonia: string | null;
  pagina: number;
  pagine: number[];
  blocchi: MagicItemBlock[];
  sourceSha256: string;
}

interface Repair { edizione: string; id: string; pagina: number; prima: string; dopo: string; motivo: string }

export const MAGIC_ITEM_SOURCES: Record<MagicItemEdition, { url: string; sha256: string; srd: string }> = {
  "2024": { url: data2024.sourceUrl, sha256: data2024.sourceSha256, srd: "SRD 5.2.1" },
  "2014": { url: data2014.sourceUrl, sha256: data2014.sourceSha256, srd: "SRD 5.1" },
};

/** Display-only repairs: every printed text must be found exactly once in its item. */
function repaired(item: MagicItem, edition: MagicItemEdition): MagicItem {
  const own = (repairs.sostituzioni as Repair[]).filter(repair => repair.edizione === edition && repair.id === item.id);
  if (!own.length) return item;
  let json = JSON.stringify(item);
  for (const repair of own) {
    const printed = JSON.stringify(repair.prima).slice(1, -1);
    if (json.split(printed).length !== 2) throw new Error(`repair ${repair.id}: "${repair.prima}" not found once`);
    json = json.replace(printed, JSON.stringify(repair.dopo).slice(1, -1));
  }
  const shown: MagicItem = JSON.parse(json);
  return shown.nome === item.nome ? shown : { ...shown, nomeStampato: item.nome };
}

const load = (edition: MagicItemEdition, records: unknown[]) =>
  (records as MagicItem[]).map(item => repaired(item, edition)).sort((a, b) => a.nome.localeCompare(b.nome, "it"));

export const magicItems: Record<MagicItemEdition, MagicItem[]> = {
  "2024": load("2024", data2024.oggetti),
  "2014": load("2014", data2014.oggetti),
};

export const magicItemHref = (id: string) => `/oggetti-magici/${id}`;

export function magicItemListRows(edition: MagicItemEdition): MagicItemListRow[] {
  return magicItems[edition].map(item => ({
    id: item.id,
    href: magicItemHref(item.id),
    nome: item.nome,
    tipo: item.tipo,
    rarita: item.rarita,
    rarita_categorie: rarityCategories(item.rarita),
    sintonia: item.sintonia,
  }));
}

/** "Richiede sintonia con un incantatore", as printed in the type line. */
export const attunementText = (item: MagicItem) => item.sintonia ? `Richiede sintonia${item.requisitoSintonia ? ` ${item.requisitoSintonia}` : ""}` : null;

/**
 * The rules on magic items (attunement, charges…) are the manual entry "Oggetti magici": linked, never
 * copied. The manual is published only where it is available (preview), so elsewhere there is no link.
 */
export const magicItemsRulesHref = (environment = process.env.VERCEL_ENV) =>
  manualAvailable(environment) ? "/manuale/equipaggiamento-oggetti-magici" : undefined;
