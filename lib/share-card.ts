/**
 * «Condividi come immagine» (PROMPT 50): what a card of a public sheet carries to the phone, which draws it
 * (lib/share-card-draw.ts). Built on the server from the data of the sheet the page shows, never from hidden parts;
 * no server function makes the image.
 */

/** The kinds of sheets with the button (statistics: share_image_* with the kind). */
export const SHARE_KINDS = ["incantesimo", "mostro", "oggetto-magico", "condizione", "arma", "armatura", "avventura", "strumento", "padronanza", "proprieta", "regola", "talento"] as const;
export type ShareKind = (typeof SHARE_KINDS)[number];
export const SHARE_KIND_LABELS: Record<ShareKind, string> = {
  incantesimo: "Incantesimi", mostro: "Mostri", "oggetto-magico": "Oggetti magici", condizione: "Condizioni", arma: "Armi", armatura: "Armature",
  avventura: "Oggetti d’avventura", strumento: "Strumenti", padronanza: "Padronanze", proprieta: "Proprietà", regola: "Regole", talento: "Talenti",
};

/** Story 1080×1920, Square 1080×1080. */
export const SHARE_FORMATS = ["storia", "quadrato"] as const;
export type ShareFormat = (typeof SHARE_FORMATS)[number];
export const SHARE_SIZES: Record<ShareFormat, { w: number; h: number }> = { storia: { w: 1080, h: 1920 }, quadrato: { w: 1080, h: 1080 } };

/** scuro: rules and spells; immagine: a creature with its picture; pergamena: objects. */
export type ShareTheme = "scuro" | "immagine" | "pergamena";

export interface ShareCard {
  kind: ShareKind;
  theme: ShareTheme;
  /** «INCANTESIMO · 1° LIVELLO»: drawn in capitals. */
  kicker: string;
  title: string;
  /** The official English name of an SRD sheet (lib/data/nomi-inglesi-srd.json), never another one. */
  en?: string;
  /**
   * A NO SRD sheet: its English name, when approved by the administrator, lives only in the search index (PROMPT 37:
   * never in the HTML of the sheet). The card reads it from /ricerca-indice.json when it is made.
   */
  enFromSearch?: true;
  /** Up to four boxes: «Lancio 1 azione». */
  boxes: { label: string; value: string }[];
  /** The beginning of the text of the sheet, cut at a whole word (excerpt()): it ends with «…» when cut. */
  excerpt: string;
  /** SRD sheets only: «Testo SRD 5.2.1 · CC BY 4.0 · Wizards of the Coast». */
  attribution?: string;
  /** Same domain only (/immagini-mostri/…): the canvas stays clean and can be saved. */
  image?: string;
}

/** The short attribution of a card (PROMPT 50): the full one is on the sheet linked and on /fonti. */
export const srdLine = (edition: "2014" | "2024") => `Testo ${edition === "2014" ? "SRD 5.1" : "SRD 5.2.1"} · CC BY 4.0 · Wizards of the Coast`;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", "#39": "'" };

/**
 * The text of a sheet without its formatting: tags, *markdown* marks, list bullets and line breaks become plain text; the words and
 * their characters stay as printed.
 */
export function plainText(text: string): string {
  return text
    .replace(/<br\s*\/?>|<\/(?:p|li|div|h\d)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/g, (_, name: string) => ENTITIES[name])
    .replace(/\\\*/g, "\u0000")
    .replace(/\*+/g, "")
    .replace(/\u0000/g, "*")
    // The bullets of a printed list («• Una creatura accecata…»): the sheet draws them as a list.
    .replace(/(^|\s)•\s*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Longest excerpt carried to the phone: the card shows 3–4 lines of it. */
export const EXCERPT_MAX = 360;

/**
 * The beginning of a text, cut at a whole word with «…» when longer than max: never rewritten, never summarised.
 * The punctuation right before the cut is left out («, …» never appears).
 */
export function excerpt(text: string, max = EXCERPT_MAX): string {
  const plain = plainText(text);
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max + 1);
  const end = cut.lastIndexOf(" ");
  return `${(end > 0 ? cut.slice(0, end) : plain.slice(0, max)).replace(/[\s,;:.–—-]+$/, "")}…`;
}

/** The link of a card shared as a Square: the address of the sheet with the mark of a friend's link. */
export function friendLink(path: string): string {
  const url = new URL(path, "https://ilgrimorio.app");
  url.searchParams.set("da", "amico");
  return url.href;
}
