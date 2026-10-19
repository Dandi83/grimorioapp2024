import index from "./data/spell-reference-index.json";
const normalize = (text: string) => text.toLocaleLowerCase("it").replace(/\s+/g," ").trim();
const spellNames = new Set(index.map(spell => normalize(spell.name)));
const FREQUENCY = /^(\s*(?:<(?:strong|b|em|i)>\s*)*(?:a\s+volontà|\d+\s*(?:\/\s*(?:giorno|riposo)|volt[ae]\s+al\s+giorno))[^:<]*:\s*(?:<\/(?:strong|b|em|i)>\s*)?)([\s\S]*)$/i;

/** Recognize exact catalog names only in explicit casting lists, never ordinary prose. */
export function formatMonsterSpellLists(html: string): string {
  let inList = false;
  return html.split(/(<br\s*\/?>|\r?\n)/gi).map(line => {
    if (/^(?:<br\s*\/?>|\r?\n)$/i.test(line)) return line;
    const frequency = line.match(FREQUENCY);
    if (frequency) inList = true;
    else if (!line.trim() || /^\s*<(?:strong|b)>/i.test(line)) inList = false;
    if (!inList) return line;
    const list = frequency ? frequency[2] : line;
    const linked = list.split(/([,;])/).map(entry => {
      // Imported italic markup is preserved byte-for-byte. Only plain entries need decoration.
      if (entry.includes("<")) return entry;
      const parts = entry.match(/^(\s*)([^()]*?)(\s*(?:\([^)]*\))?[.!]?\s*)$/);
      if (!parts || !spellNames.has(normalize(parts[2]))) return entry;
      return `${parts[1]}<em>${parts[2]}</em>${parts[3]}`;
    }).join("");
    return (frequency ? frequency[1] : "") + linked;
  }).join("");
}

/** Explicit italics and exact names in casting lists are eligible for links. */
export function findReferencedSpells(html: string) {
  const italic = [...formatMonsterSpellLists(html).matchAll(/<(em|i)>([\s\S]*?)<\/\1>/gi)].map(match => normalize(match[2].replace(/<[^>]*>/g," ").replace(/\([^)]*\)/g,"")));
  return index.filter(spell => italic.some(text => text.split(/[,;]/).some(part => normalize(part).replace(/[.!]$/, "") === normalize(spell.name))));
}

export function inlineSpellReferences(html: string) {
  return findReferencedSpells(html).map(spell => ({ label: spell.name, href: `/spell/${spell.id}` }));
}
