// «La tua edizione»: one edition, 2024 or 2014, for the whole public app. Pure helpers, safe in
// client components and tests; the shared state lives in components/edition/edition-provider.tsx.

import { EDITIONS, PUBLIC_SECTIONS, partId, type Edition } from "./public-sections";

/** The edition chosen on this phone or browser. */
export const USER_EDITION_KEY = "grimorio.edizione";

/**
 * Where each section remembered its own edition before the single choice. Read once, to adopt the
 * edition of someone already using the app; never written again (left in place).
 * Equipaggiamento's key was shared by Condizioni, Oggetti magici and Classi.
 */
export const LEGACY_EDITION_KEYS = ["grimorio.incantesimi.edizione", "grimorio.bestiario.edizione", "grimorio.equipaggiamento.edizione"] as const;

export const isEdition = (value: unknown): value is Edition => value === "2024" || value === "2014";

/**
 * The edition stored on the device. chosen: false when nobody has chosen yet (the first launch is due).
 * migrated: the old keys of the sections all said the same edition, which becomes the user's one
 * (to be written under USER_EDITION_KEY). Old keys that disagree, or none, leave the choice open.
 */
export function storedEdition(read: (key: string) => string | null): { edition: Edition; chosen: boolean; migrated?: true } {
  const own = read(USER_EDITION_KEY);
  if (isEdition(own)) return { edition: own, chosen: true };
  const old = LEGACY_EDITION_KEYS.map(read).filter(isEdition);
  if (old.length && old.every(value => value === old[0])) return { edition: old[0], chosen: true, migrated: true };
  return { edition: "2024", chosen: false };
}

/**
 * The edition the public is held to when the other one is hidden from /admin/sezioni in every visible
 * section that has editions; undefined when both are offered somewhere. A section hiding one edition
 * on its own still shows the other there (useEditions), whatever the user's edition.
 * hiddenSections: hidden section keys; hiddenParts: part ids ("incantesimi:2014").
 */
export function forcedEdition(hiddenSections: readonly string[], hiddenParts: readonly string[]): Edition | undefined {
  const withEditions = PUBLIC_SECTIONS.filter(section => !hiddenSections.includes(section.key)
    && (section.parts as readonly { key: string }[]).some(part => part.key === "2014"));
  if (!withEditions.length) return undefined;
  const offered = EDITIONS.filter(edition => withEditions.some(section => !hiddenParts.includes(partId(section.key, edition))));
  return offered.length === 1 ? offered[0] : undefined;
}

/** «2024» → «2014» and back. */
export const otherEdition = (edition: Edition): Edition => (edition === "2024" ? "2014" : "2024");
