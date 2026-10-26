import "server-only";
import { isNoSrdSource } from "./card-display";
import { provenanceIds } from "./provenance";
import { getAllMonsters } from "./monsters";
import { getAllSpells } from "./spells";
import { catalogModified } from "./srd-modified-server";

/**
 * The NO SRD cards of the catalog (lib/card-display.ts), for the asterisk the administrator sees in the lists.
 * Only /api/admin/no-srd (session checked, never cached) hands them to the browser: never the public pages,
 * their offline copies or /api/catalogo/*. Cards added later are included at once: the rule reads the card.
 */
export interface NoSrdIds {
  incantesimi: string[]; mostri: string[];
  /** The original summaries among them (the «Sintesi originale» switch and the 49 of the project), for the «Provenienza» filter. */
  sintesi: { incantesimi: string[]; mostri: string[] };
  /** «SRD modificate»: SRD cards that no longer match their record (lib/srd-modified.ts), for the same filter. */
  modificate: { incantesimi: string[]; mostri: string[] };
}

export async function noSrdIds(): Promise<NoSrdIds> {
  const [spells, monsters] = await Promise.all([getAllSpells(), getAllMonsters()]);
  const modified = catalogModified(spells, monsters);
  return {
    incantesimi: spells.filter(spell => isNoSrdSource(spell.fonte_scheda)).map(spell => spell.id),
    mostri: monsters.filter(monster => isNoSrdSource(monster.fonte_scheda)).map(monster => monster.id),
    sintesi: { incantesimi: [...provenanceIds(spells).sintesi], mostri: [...provenanceIds(monsters).sintesi] },
    modificate: {
      incantesimi: modified.filter(card => card.kind === "incantesimo").map(card => card.id),
      mostri: modified.filter(card => card.kind === "mostro").map(card => card.id),
    },
  };
}
