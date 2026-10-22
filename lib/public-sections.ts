/**
 * Public sections that the administrator can hide from /admin/sezioni («Sezioni dell'app»).
 *
 * HOW TO ADD A SECTION: add ONE entry to PUBLIC_SECTIONS below, with
 *   - key: the stored name (never change it once published: the saved state uses it);
 *   - title / where: the row of /admin/sezioni and the Compendio tile it hides;
 *   - paths: the addresses of its pages (lists and cards). An entry ending in "/" or "-" is a prefix,
 *     any other one is the page and everything under it.
 * Then wrap its pages in <SectionGate> (a layout.tsx in its folder, see app/classi/layout.tsx).
 * The section is born visible: nothing is stored until it is hidden the first time.
 * Pure module (no database): the layout, the search, the service worker messages and the tests share it.
 */

export interface PublicSection {
  key: string;
  title: string;
  where: string;
  paths: readonly string[];
}

export const PUBLIC_SECTIONS = [
  { key: "incantesimi", title: "Incantesimi", where: "Menu in basso", paths: ["/grimorio", "/spell/"] },
  { key: "bestiario", title: "Bestiario", where: "Menu in basso", paths: ["/bestiario", "/mostro/"] },
  { key: "classi", title: "Classi", where: "Compendio · Personaggi", paths: ["/classi"] },
  { key: "armi", title: "Armi", where: "Compendio · Equipaggiamento", paths: ["/equipaggiamento/armi"] },
  { key: "armature", title: "Armature", where: "Compendio · Equipaggiamento", paths: ["/equipaggiamento/armature"] },
  { key: "avventura", title: "Equipaggiamento d’avventura", where: "Compendio · Equipaggiamento", paths: ["/equipaggiamento/avventura"] },
  { key: "strumenti", title: "Strumenti", where: "Compendio · Equipaggiamento", paths: ["/equipaggiamento/strumenti"] },
  { key: "oggetti-magici", title: "Oggetti magici", where: "Compendio", paths: ["/oggetti-magici"] },
  { key: "condizioni", title: "Condizioni", where: "Compendio", paths: ["/compendio/condizioni", "/manuale/condizioni-"] },
  { key: "avanzamento", title: "Avanzamento", where: "Compendio", paths: ["/avanzamento"] },
] as const satisfies readonly PublicSection[];

export type PublicSectionKey = (typeof PUBLIC_SECTIONS)[number]["key"];

/** The four sections under the Equipaggiamento tile of the Compendio. */
export const EQUIPMENT_SECTIONS: readonly PublicSectionKey[] = ["armi", "armature", "avventura", "strumenti"];

export function isPublicSectionKey(value: unknown): value is PublicSectionKey {
  return PUBLIC_SECTIONS.some(section => section.key === value);
}

export function publicSection(key: PublicSectionKey): PublicSection {
  return PUBLIC_SECTIONS.find(section => section.key === key)!;
}

const matches = (pathname: string, path: string) =>
  path.endsWith("/") || path.endsWith("-") ? pathname.startsWith(path) && pathname.length > path.length : pathname === path || pathname.startsWith(`${path}/`);

/** The section of an address ("/classi/mago?edizione=2014" → classi), or undefined. */
export function sectionOfPath(href: string): PublicSectionKey | undefined {
  const pathname = href.split(/[?#]/)[0];
  return PUBLIC_SECTIONS.find(section => section.paths.some(path => matches(pathname, path)))?.key;
}

/** True when the address belongs to one of the hidden sections. */
export function isHiddenPath(href: string, hidden: readonly string[]): boolean {
  const key = sectionOfPath(href);
  return key !== undefined && hidden.includes(key);
}

/** Links of a text (conditions, spells) that lead to a visible page; the others stay plain text. */
export function visibleLinks<T extends { href: string }>(links: readonly T[], hidden: readonly string[]): T[] {
  return hidden.length ? links.filter(link => !isHiddenPath(link.href, hidden)) : [...links];
}
