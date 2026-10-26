// «Resistenza», «immunità» and «vulnerabilità» in the texts of the cards, linked to the rule of the edition of
// the card like a condition (lib/concentration.ts holds the rule texts). Only where the word has its rule meaning:
// resistance, immunity or vulnerability to damage (and immunity to a condition), never «Resistenza alla magia»,
// «Resistenza leggendaria», «immune a questo effetto» or a material «resistente». One link per term per paragraph.
// No data here: safe in the client code of the editor previews.

import { isHiddenPath } from "./public-sections";

export type RuleTerm = "resistenza" | "immunita" | "vulnerabilita";
/** Where each term leads for the edition of a card; condizioni: «immunità alle condizioni» (undefined if hidden). */
export interface RuleTermLinks { resistenza: string; immunita: string; vulnerabilita: string; condizioni?: string }
export interface RuleSpot { start: number; end: number; href: string; term: RuleTerm }

export const CONDITIONS_PAGE = "/compendio/condizioni";

/** 2024: the three entries of the Glossario delle regole; 2014: «Resistenza e vulnerabilità ai danni» (Combattimento) and «Vulnerabilità, resistenze e immunità» (Mostri). */
export function damageRuleLinks(legacy: boolean, hidden: readonly string[] = []): RuleTermLinks {
  const condizioni = isHiddenPath(CONDITIONS_PAGE, hidden) ? undefined : CONDITIONS_PAGE;
  return legacy
    ? { resistenza: "/regole/resistenza-vulnerabilita-2014", immunita: "/regole/immunita-2014", vulnerabilita: "/regole/resistenza-vulnerabilita-2014", condizioni }
    : { resistenza: "/regole/resistenza", immunita: "/regole/immunita", vulnerabilita: "/regole/vulnerabilita", condizioni };
}

const TERM = /(?<![\p{L}\p{N}_])(resistenz[ae]|resistent[ei]|immunità|immun[ei]|vulnerabilità|vulnerabil[ei])(?![\p{L}\p{N}_])/giu;
const termOf = (word: string): RuleTerm => /^resist/i.test(word) ? "resistenza" : /^immun/i.test(word) ? "immunita" : "vulnerabilita";

const DAMAGE = "dann[oi]|acid[oi]|contundent[ei]|perforant[ei]|taglient[ei]|fuoco|freddo|fulmin[ei]|tuono|velen[oi]|forza|necrotic[oi]|radiant[ei]|radios[oi]|psichic[oi]";
const CONDITION = "condizion[ei]|accecat[oaie]|affascinat[oaie]|afferrat[oaie]|assordat[oaie]|avvelenat[oaie]|incapacitat[oaie]|paralizzat[oaie]|pietrificat[oaie]|pron[oaie]|spaventat[oaie]|stordit[oaie]|trattenut[oaie]|priv[oaie] di sensi|invisibil[ei]|indebolimento";
// What follows the term in the same clause (no comma, stop or bracket before it), within eight words: the damage
// («resistenza ai danni da fuoco», «resistenza per 1 ora a un tipo di danno») or, for immunity, a condition.
// A subordinate clause starts something else («immune a questo effetto se è immune ai danni…», «resistenza fisica a cui…»).
const CLAUSE = "^(?:[^\\S\\n]*(?!(?:se|che|cui|quando|finché|mentre|ma|perché|qualora|per\\s+proteggersi)(?![\\p{L}]))[^\\s.,;:!?()«»\\[\\]]+){0,8}?[^\\S\\n]*";
const DAMAGE_AFTER = new RegExp(`${CLAUSE}(?<![\\p{L}])(?:${DAMAGE})(?![\\p{L}])`, "iu");
const CONDITION_AFTER = new RegExp(`${CLAUSE}(?<![\\p{L}])(?:${CONDITION})(?![\\p{L}])`, "iu");
// Ability checks and saving throws are not damage («immune ai tiri salvezza su Forza»).
const NOT_DAMAGE = /\b(?:tir[oi]|prov[ae]|salvezza|caratteristic[ah]e?|punteggi[oi])\b/i;
/** «Immunità alle condizioni»: the generic list of the conditions, not a rule term. */
const CONDITIONS_NOUN = /^\s+(?:alle|alla)\s+condizion[ei](?![\p{L}])/iu;

/**
 * The places of a plain text to link: term, its destination. skip(start, end): parts that
 * may not be linked (spell names, a term split by a tag). One link per term per paragraph (paragraphs
 * separated by a blank line), the first one.
 */
export function findRuleTerms(plain: string, links: RuleTermLinks | undefined, skip: (start: number, end: number) => boolean = () => false): RuleSpot[] {
  if (!links) return [];
  const spots: RuleSpot[] = [];
  const done = new Set<string>();
  let checked = 0;
  for (const match of plain.matchAll(TERM)) {
    const start = match.index!, end = start + match[0].length;
    // A blank line (two line breaks) starts a new paragraph: its terms are linked again.
    if (/\n[^\S\n]*\n/.test(plain.slice(checked, start))) done.clear();
    checked = start;
    const term = termOf(match[0]);
    const after = plain.slice(end, end + 120);
    let href: string | undefined;
    let key: string = term;
    if (term === "immunita" && /^immunità$/i.test(match[0]) && CONDITIONS_NOUN.test(after)) { href = links.condizioni; key = "condizioni"; }
    else {
      const damage = DAMAGE_AFTER.exec(after);
      if (damage && !NOT_DAMAGE.test(damage[0])) href = links[term];
      else if (term === "immunita" && CONDITION_AFTER.test(after)) href = links.immunita;
    }
    if (!href || done.has(key) || skip(start, end)) continue;
    done.add(key);
    spots.push({ start, end, href, term });
  }
  return spots;
}

/** The label of a line of a creature sheet («Resistenze», «Immunità ai danni»…): the page it leads to. */
export function damageLineHref(label: string, links: RuleTermLinks): string | undefined {
  if (/^immunità alle condizioni$/i.test(label)) return links.condizioni;
  if (/^resistenz/i.test(label)) return links.resistenza;
  if (/^vulnerabilit/i.test(label)) return links.vulnerabilita;
  if (/^immunità/i.test(label)) return links.immunita;
  return undefined;
}
