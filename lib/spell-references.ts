import index from "./data/spell-reference-index.json";
const normalize = (text: string) => text.toLocaleLowerCase("it").replace(/\s+/g," ").trim();
/** Only explicit italic spell names from the PDF are linked; ordinary words never become spell links. */
export function findReferencedSpells(html: string) {
  const italic = [...html.matchAll(/<em>([\s\S]*?)<\/em>/g)].map(match => normalize(match[1].replace(/<[^>]*>/g," ").replace(/\([^)]*\)/g,"")));
  return index.filter(spell => italic.some(text => text.split(/[,;]/).some(part => normalize(part) === normalize(spell.name))));
}

export function inlineSpellReferences(html: string) {
  return findReferencedSpells(html).map(spell => ({ label: spell.name, href: `/spell/${spell.id}` }));
}
