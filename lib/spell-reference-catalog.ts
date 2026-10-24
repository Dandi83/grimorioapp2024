import "server-only";
import { cache } from "react";

import { getSpellIndex } from "./spell-index";
import { spellName } from "./spell-name";
import { fileSpellCatalog, type SpellReference, type SpellReferenceCatalog } from "./spell-references";

/**
 * The spell names every card links, built from the catalog the site shows: the SRD names of the files
 * (also the SRD 5.1 aliases) plus every card of the list — database rows included, so a spell added or
 * renamed in the reserved area is linked at once, with its edition. Cached with the spell list (tag
 * "spells", cleared by every save). Hidden cards are left out by the pages (visibleLinks, linksOut).
 */
export const getSpellReferenceCatalog = cache(async (): Promise<SpellReferenceCatalog> => {
  const list = await getSpellIndex();
  const shown = (edition: "2014" | "2024") => list
    .filter(spell => (spell.edizione === "2014" ? "2014" : "2024") === edition)
    .map((spell): SpellReference => ({ id: spell.id, name: spellName(spell.nome_italiano, edition) }));
  const merge = (files: readonly SpellReference[], cards: SpellReference[]) => {
    const ids = new Set(cards.map(card => card.id));
    // A file name of a card no longer listed (merged or deleted) leads nowhere.
    const seen = new Set<string>();
    return [...files.filter(spell => ids.has(spell.id)), ...cards].filter(spell => {
      const key = `${spell.id}|${spell.name.toLocaleLowerCase("it")}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  return { current: merge(fileSpellCatalog.current, shown("2024")), legacy: merge(fileSpellCatalog.legacy, shown("2014")) };
});
