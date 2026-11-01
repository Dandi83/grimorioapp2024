/**
 * The creatures «Dalla redazione» (PROMPT 44), reserved area only: the labels of the sections, which ones can be hidden,
 * the longer limits and the check of the fields only they have. Kept apart from lib/homebrew-types.ts, which the public
 * pages also load: none of this is in the public bundle.
 */

import { BLOCK_LABEL, ENTRY_BLOCKS, EDITORIAL_SECTIONS, intIn, plainText, type EditorialSection, type EntryBlock, type HideableSection, type HomebrewDraft } from "./homebrew-types";

export const EDITORIAL_LABEL: Record<EditorialSection, string> = {
  storia: "Storia e leggenda", tattiche: "Tattiche", tana: "Tana", agganci: "Agganci per l’avventura", varianti: "Varianti",
};
export const HIDEABLE_SECTIONS = ["descrizione", ...ENTRY_BLOCKS, ...EDITORIAL_SECTIONS] as const satisfies readonly HideableSection[];
export const SECTION_LABEL: Record<HideableSection, string> = {
  descrizione: "Descrizione", ...Object.fromEntries(ENTRY_BLOCKS.map(block => [block, BLOCK_LABEL[block].title])) as Record<EntryBlock, string>, ...EDITORIAL_LABEL,
};
/** The editorial staff writes longer cards: the limits of the reserved area, never of the public form. */
export const EDITORIAL_LIMITS = { entryText: 4000, entries: 20, descrizione: 4000, section: 8000, alt: 200, crediti: 200 } as const;

type ExtrasCheck = { ok: true; extras: Partial<HomebrewDraft> } | { ok: false; error: string };
const PICTURE_VERSION = /^[a-f0-9]{16}$/;

/**
 * The fields only «Dalla redazione» has (PROMPT 44), checked on the server by the admin actions: never read from the
 * public form, so a proposal can never carry them.
 */
export function parseEditorialExtras(input: unknown): ExtrasCheck {
  const data = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const extras: Partial<HomebrewDraft> = {};
  for (const key of EDITORIAL_SECTIONS) {
    const text = plainText(data[key] ?? "", EDITORIAL_LIMITS.section, true);
    if (text === null) return { ok: false, error: `${EDITORIAL_LABEL[key]}: al massimo ${EDITORIAL_LIMITS.section} caratteri, senza < >.` };
    if (text) extras[key] = text;
  }
  const hidden = Array.isArray(data.sezioni_nascoste) ? data.sezioni_nascoste : [];
  if (hidden.some(key => !(HIDEABLE_SECTIONS as readonly unknown[]).includes(key))) return { ok: false, error: "Sezioni nascoste non valide." };
  if (hidden.length) extras.sezioni_nascoste = HIDEABLE_SECTIONS.filter(key => hidden.includes(key));
  const alt = plainText(data.immagine_alt ?? "", EDITORIAL_LIMITS.alt);
  if (alt === null) return { ok: false, error: `Testo alternativo: al massimo ${EDITORIAL_LIMITS.alt} caratteri, senza < >.` };
  const crediti = plainText(data.immagine_crediti ?? "", EDITORIAL_LIMITS.crediti);
  if (crediti === null) return { ok: false, error: `Crediti dell’immagine: al massimo ${EDITORIAL_LIMITS.crediti} caratteri, senza < >.` };
  if (alt) extras.immagine_alt = alt;
  if (crediti) extras.immagine_crediti = crediti;
  const picture = data.immagine as Record<string, unknown> | undefined;
  if (picture !== undefined && picture !== null) {
    const w = intIn(picture.w, 1, 4000), h = intIn(picture.h, 1, 4000);
    if (typeof picture.v !== "string" || !PICTURE_VERSION.test(picture.v) || w === null || h === null) return { ok: false, error: "Immagine non valida: caricala di nuovo." };
    if (!alt) return { ok: false, error: "Scrivi il testo alternativo dell’immagine: cosa si vede, per chi non può vederla." };
    extras.immagine = { v: picture.v, w, h };
  }
  if (data.testo_ricco === true) extras.testo_ricco = true;
  return { ok: true, extras };
}

