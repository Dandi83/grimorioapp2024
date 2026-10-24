import index from "./data/spell-reference-index.json";
import legacyIndex from "./data/spell-reference-index-2014.json";

export type SpellReference = { id: string; name: string };
/**
 * The spell names the cards can link: 2024 names lead to 2024 cards, 2014 names (with the SRD 5.1 aliases)
 * to 2014 cards. The files below are the SRD names; lib/spell-reference-catalog.ts adds every card of the
 * catalog as the site shows it (database included: added or renamed cards, with their edition).
 */
export interface SpellReferenceCatalog { current: readonly SpellReference[]; legacy: readonly SpellReference[] }

// 2014 creature sheets name their spells as in the SRD 5.1: these names lead only to 2014 cards.
const published = new Set(legacyIndex.spells.map(spell => spell.id));
export const fileSpellCatalog: SpellReferenceCatalog = {
  current: index,
  legacy: [
    ...legacyIndex.spells,
    ...Object.entries(legacyIndex.alias as Record<string, string>).filter(([, id]) => published.has(id)).map(([name, id]) => ({ id, name })),
  ],
};
const normalize = (text: string) => text.toLocaleLowerCase("it").replace(/\s+/g," ").trim();
const names = (list: readonly SpellReference[]) => new Set(list.map(spell => normalize(spell.name)));
const namesCache = new WeakMap<SpellReferenceCatalog, { current: Set<string>; legacy: Set<string> }>();
/** 2014 sheets keep the italics they already had: their names are those of both lists; only 2014 cards become links. */
function knownNames(catalog: SpellReferenceCatalog) {
  let known = namesCache.get(catalog);
  if (!known) {
    const current = names(catalog.current);
    known = { current, legacy: new Set([...current, ...names(catalog.legacy)]) };
    namesCache.set(catalog, known);
  }
  return known;
}
const FREQUENCY = /^(\s*(?:<(?:strong|b|em|i)>\s*)*(?:a\s+volontà|\d+\s*(?:\/\s*(?:giorno|riposo)|volt[ae]\s+al\s+giorno))[^:<]*:\s*(?:<\/(?:strong|b|em|i)>\s*)?)([\s\S]*)$/i;

/** Recognize exact catalog names only in explicit casting lists, never ordinary prose. */
export function formatMonsterSpellLists(html: string, legacy = false, catalog: SpellReferenceCatalog = fileSpellCatalog): string {
  const known = legacy ? knownNames(catalog).legacy : knownNames(catalog).current;
  let inList = false;
  return html.split(/(<br\s*\/?>|\r?\n)/gi).map(line => {
    if (/^(?:<br\s*\/?>|\r?\n)$/i.test(line)) return line;
    const frequency = line.match(FREQUENCY);
    if (frequency) inList = true;
    else if (!line.trim() || /^\s*<(?:strong|b)>/i.test(line)) inList = false;
    if (!inList) return line;
    const list = frequency ? frequency[2] : line;
    let italic = 0;
    const linked = list.split(/([,;])/).map(entry => {
      // Imported italic markup is preserved byte-for-byte. Only plain entries outside it need decoration.
      const inside = italic > 0;
      italic += (entry.match(/<(?:em|i)>/gi) || []).length - (entry.match(/<\/(?:em|i)>/gi) || []).length;
      if (inside || entry.includes("<")) return entry;
      const parts = entry.match(/^(\s*)([^()]*?)(\s*(?:\([^)]*\))?[.!]?\s*)$/);
      if (!parts || !known.has(normalize(parts[2]))) return entry;
      return `${parts[1]}<em>${parts[2]}</em>${parts[3]}`;
    }).join("");
    return (frequency ? frequency[1] : "") + linked;
  }).join("");
}

/** Explicit italics and exact names in casting lists are eligible for links. */
export function findReferencedSpells(html: string, legacy = false, catalog: SpellReferenceCatalog = fileSpellCatalog): SpellReference[] {
  const italic = [...formatMonsterSpellLists(html, legacy, catalog).matchAll(/<(em|i)>([\s\S]*?)<\/\1>/gi)].map(match => normalize(match[2].replace(/<[^>]*>/g," ").replace(/\([^)]*\)/g,"")));
  const seen = new Set<string>();
  return (legacy ? catalog.legacy : catalog.current).filter(spell => {
    const name = normalize(spell.name);
    const key = `${spell.id}|${name}`;
    if (seen.has(key) || !italic.some(text => text.split(/[,;]/).some(part => normalize(part).replace(/[.!*]+$/, "") === name))) return false;
    seen.add(key);
    return true;
  });
}

export function inlineSpellReferences(html: string, legacy = false, catalog: SpellReferenceCatalog = fileSpellCatalog) {
  return findReferencedSpells(html, legacy, catalog).map(spell => ({ label: spell.name, href: `/spell/${spell.id}` }));
}

/**
 * Cards written in the reserved area or proposed (plain text, no italics): the catalog names of two words or
 * more written in the prose become spell names, as the italics of the SRD cards («palla di fuoco»). Bold
 * titles, existing italics and tables are left as they are; one-word names («luce», «scudo») only in casting
 * lists or in italics, never in ordinary prose.
 */
export function markSpellNames(html: string, legacy = false, catalog: SpellReferenceCatalog = fileSpellCatalog): string {
  if (!html) return html;
  const list = [...new Set((legacy ? catalog.legacy : catalog.current).map(spell => normalize(spell.name)))]
    .filter(name => name.split(" ").length > 1)
    .sort((a, b) => b.length - a.length);
  if (!list.length) return html;
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(`(?<![\\p{L}\\p{N}])(${list.map(name => name.split(" ").map(escape).join("\\s+")).join("|")})(?![\\p{L}\\p{N}])`, "giu");
  let depth = 0;
  return html.split(/(<[^>]+>)/g).map(part => {
    if (part.startsWith("<")) {
      if (/^<\s*(?:strong|b|em|i|pre)\b/i.test(part)) depth++;
      else if (/^<\s*\/\s*(?:strong|b|em|i|pre)\b/i.test(part)) depth = Math.max(0, depth - 1);
      return part;
    }
    return depth ? part : part.replace(matcher, "<em>$1</em>");
  }).join("");
}
