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
 *
 * PARTS: what can be hidden inside a section (an edition, a collection, a tab, a block of a page).
 * Add ONE entry to the section's parts, with
 *   - key / title / group: the stored name, the row in /admin/sezioni and its group;
 *   - set: parts that together make up the pages (both editions, the two collections, the blocks of
 *     Avanzamento): when all the parts of a set are hidden, the section behaves as hidden;
 *   - page: a public page where the part is drawn, marked data-part="<section>:<key>" (checked by a test).
 * Then draw it only when partShown() / usePart() says so (components/sections/parts-context.tsx).
 * Pure module (no database): the layout, the search, the service worker messages and the tests share it.
 */

export type PartGroup = "edizioni" | "raccolte" | "blocchi";
export const PART_GROUPS: Record<PartGroup, string> = { edizioni: "Edizioni", raccolte: "Raccolte e schede", blocchi: "Blocchi" };

export interface SectionPart {
  key: string;
  title: string;
  group: PartGroup;
  set?: "edizione" | "raccolta" | "blocchi";
  page: string;
}

interface PublicSection {
  key: string;
  title: string;
  where: string;
  paths: readonly string[];
  parts: readonly SectionPart[];
}

export type Edition = "2024" | "2014";
export const EDITIONS: readonly Edition[] = ["2024", "2014"];

/** «Edizione 2014» and «Edizione 2024»: list, page and sample card of each. */
const editions = (list: string, card2014 = list, card2024 = list): SectionPart[] => [
  { key: "2014", title: "Edizione 2014", group: "edizioni", set: "edizione", page: card2014 },
  { key: "2024", title: "Edizione 2024", group: "edizioni", set: "edizione", page: card2024 },
];
const COMPARISON = "Riquadro «2014 → 2024»";

export const PUBLIC_SECTIONS = [
  { key: "incantesimi", title: "Incantesimi", where: "Menu in basso", paths: ["/grimorio", "/spell/"], parts: editions("/grimorio") },
  { key: "bestiario", title: "Bestiario", where: "Menu in basso", paths: ["/bestiario", "/mostro/"], parts: [
    ...editions("/bestiario"),
    { key: "mostri", title: "Raccolta Mostri", group: "raccolte", set: "raccolta", page: "/bestiario" },
    { key: "animali", title: "Raccolta Animali", group: "raccolte", set: "raccolta", page: "/bestiario" },
    // The creatures of the community and the form «Proponi una creatura» (/bestiario/proponi).
    { key: "homebrew", title: "I mostri creati da voi", group: "raccolte", set: "raccolta", page: "/bestiario" },
    // PROMPT 25: the original creatures of the editorial staff (homebrew without an author), «In arrivo» until set.
    { key: "grimorio", title: "Mostri del Grimorio", group: "raccolte", set: "raccolta", page: "/bestiario" },
  ] },
  { key: "classi", title: "Classi", where: "Compendio · Personaggi", paths: ["/classi"], parts: [
    ...editions("/classi/mago"),
    { key: "tab-tabella", title: "Tab Tabella", group: "raccolte", page: "/classi/mago" },
    { key: "tab-sottoclasse", title: "Tab Sottoclasse", group: "raccolte", page: "/classi/mago" },
    { key: "abilita", title: "Riga «Abilità ed equipaggiamento iniziale»", group: "raccolte", page: "/classi/mago" },
    { key: "diventare", title: "Riga «Diventare un…»", group: "raccolte", page: "/classi/mago" },
    { key: "lista-incantesimi", title: "Lista degli incantesimi", group: "raccolte", page: "/classi/mago" },
    { key: "incantesimi-del", title: "Pulsante «Incantesimi del…»", group: "raccolte", page: "/classi/mago" },
  ] },
  { key: "armi", title: "Armi", where: "Compendio · Equipaggiamento", paths: ["/equipaggiamento/armi"], parts: [
    ...editions("/equipaggiamento/armi"),
    { key: "confronto", title: COMPARISON, group: "raccolte", page: "/equipaggiamento/armi/tridente" },
  ] },
  { key: "armature", title: "Armature", where: "Compendio · Equipaggiamento", paths: ["/equipaggiamento/armature"], parts: editions("/equipaggiamento/armature") },
  { key: "avventura", title: "Equipaggiamento d’avventura", where: "Compendio · Equipaggiamento", paths: ["/equipaggiamento/avventura"], parts: [
    ...editions("/equipaggiamento/avventura"),
    { key: "confronto", title: COMPARISON, group: "raccolte", page: "/equipaggiamento/avventura/ampolla" },
    { key: "dotazioni", title: "Blocco «Dotazioni»", group: "blocchi", page: "/equipaggiamento/avventura" },
  ] },
  { key: "strumenti", title: "Strumenti", where: "Compendio · Equipaggiamento", paths: ["/equipaggiamento/strumenti"], parts: [
    ...editions("/equipaggiamento/strumenti"),
    { key: "confronto", title: COMPARISON, group: "raccolte", page: "/equipaggiamento/strumenti/mazzo-di-carte" },
  ] },
  { key: "oggetti-magici", title: "Oggetti magici", where: "Compendio", paths: ["/oggetti-magici"], parts: [
    ...editions("/oggetti-magici"),
    { key: "confronto", title: COMPARISON, group: "raccolte", page: "/oggetti-magici/anello-di-resistenza" },
  ] },
  { key: "condizioni", title: "Condizioni", where: "Compendio", paths: ["/compendio/condizioni", "/manuale/condizioni-"], parts: editions("/compendio/condizioni") },
  { key: "avanzamento", title: "Avanzamento", where: "Compendio", paths: ["/avanzamento"], parts: [
    { key: "tabella", title: "Tabella di avanzamento", group: "blocchi", set: "blocchi", page: "/avanzamento" },
    { key: "punti-ferita", title: "Punti ferita fissi per classe", group: "blocchi", set: "blocchi", page: "/avanzamento" },
    { key: "talenti", title: "Talenti bonus oltre il 20º livello", group: "blocchi", set: "blocchi", page: "/avanzamento" },
    { key: "calcolatore", title: "Calcolatore di PE", group: "blocchi", set: "blocchi", page: "/avanzamento" },
  ] },
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

/**
 * The edition of a card address, when the address says it: 2014 spells, creatures and conditions have
 * "-2014" ids, the other sections use "?edizione=2014"; a shared page has none.
 */
export function editionOfPath(href: string): Edition | undefined {
  const [pathname, query = ""] = href.split("#")[0].split("?");
  if (new URLSearchParams(query).get("edizione") === "2014") return "2014";
  const key = sectionOfPath(pathname);
  if (key !== "incantesimi" && key !== "bestiario" && key !== "condizioni") return undefined;
  if (pathname === "/grimorio" || pathname === "/bestiario" || pathname === "/compendio/condizioni") return undefined;
  return pathname.endsWith("-2014") ? "2014" : "2024";
}

/**
 * True when the address belongs to a hidden section, or to a hidden edition of its section, or is a hidden card.
 * hidden: section keys, part ids ("incantesimi:2014") and card addresses together.
 */
export function isHiddenPath(href: string, hidden: readonly string[]): boolean {
  // A single hidden card is named by its address ("/spell/<id>", "/mostro/<id>").
  if (hidden.length && hidden.includes(href.split(/[?#]/)[0])) return true;
  const key = sectionOfPath(href);
  if (key === undefined) return false;
  if (hidden.includes(key)) return true;
  const edition = editionOfPath(href);
  return edition !== undefined && hidden.includes(partId(key, edition));
}

/** Links of a text (conditions, spells) that lead to a visible page; the others stay plain text. hidden as in isHiddenPath. */
export function visibleLinks<T extends { href: string }>(links: readonly T[], hidden: readonly string[]): T[] {
  return hidden.length ? links.filter(link => !isHiddenPath(link.href, hidden)) : [...links];
}

/** The id of a part: "<section>:<part>" ("classi:tab-tabella", "incantesimi:2014"). */
export const partId = (section: string, part: string) => `${section}:${part}`;

export function sectionParts(key: string): readonly SectionPart[] {
  return (PUBLIC_SECTIONS as readonly PublicSection[]).find(section => section.key === key)?.parts ?? [];
}

export function isPartId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const [section, part, ...rest] = value.split(":");
  return !rest.length && sectionParts(section).some(item => item.key === part);
}

/**
 * Sections that behave as hidden: hidden themselves, or with every part of a set hidden
 * (both editions, both collections, all the blocks of a page).
 */
export function effectiveHidden(sections: readonly string[], parts: readonly string[]): PublicSectionKey[] {
  return PUBLIC_SECTIONS.filter(section => sections.includes(section.key) || (section.parts as readonly SectionPart[]).some(part =>
    part.set && (section.parts as readonly SectionPart[]).filter(other => other.set === part.set).every(other => parts.includes(partId(section.key, other.key)))))
    .map(section => section.key);
}

/** The editions of a section that the public sees (both when none is hidden). */
export function shownEditions(section: string, hiddenParts: readonly string[]): Edition[] {
  return EDITIONS.filter(edition => !hiddenParts.includes(partId(section, edition)));
}

/**
 * «In arrivo»: the section or part of an address the public sees as coming (soon: section keys and part ids,
 * lib/section-visibility.ts), with the title of its pill «<title> · In arrivo»; undefined otherwise.
 */
export function soonOfPath(href: string, soon: readonly string[]): string | undefined {
  if (!soon.length) return undefined;
  const key = sectionOfPath(href);
  if (key === undefined) return undefined;
  if (soon.includes(key)) return publicSection(key).title;
  const edition = editionOfPath(href);
  const part = edition !== undefined && soon.includes(partId(key, edition)) ? sectionParts(key).find(item => item.key === edition) : undefined;
  if (part) return `${publicSection(key).title} ${edition}`;
  // A page whose parts of a set are all «In arrivo» (both editions, all the blocks).
  const sets = sectionParts(key).filter(item => item.set);
  return sets.length && sets.every(item => soon.includes(partId(key, item.key))) ? publicSection(key).title : undefined;
}

/** The address of the «in costruzione» page of a section or part «In arrivo» (app/in-arrivo/[id]/page.tsx). */
export const soonHref = (id: string) => `/in-arrivo/${encodeURIComponent(id)}`;

/** The title of a section key or part id, for the pill of /in-arrivo; undefined when unknown. */
export function soonTitle(id: string): string | undefined {
  const [key, part] = id.split(":");
  if (!isPublicSectionKey(key)) return undefined;
  if (part === undefined) return publicSection(key).title;
  const item = sectionParts(key).find(entry => entry.key === part);
  if (!item) return undefined;
  return item.group === "edizioni" ? `${publicSection(key).title} ${part}` : item.title;
}
