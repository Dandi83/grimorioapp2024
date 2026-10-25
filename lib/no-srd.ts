import "server-only";
import { isNoSrdSource } from "./card-display";
import { getAllMonsters } from "./monsters";
import { getAllSpells } from "./spells";

/**
 * The NO SRD cards of the catalog (lib/card-display.ts), for the asterisk the administrator sees in the lists.
 * Only /api/admin/no-srd (session checked, never cached) hands them to the browser: never the public pages,
 * their offline copies or /api/catalogo/*. Cards added later are included at once: the rule reads the card.
 */
export async function noSrdIds(): Promise<{ incantesimi: string[]; mostri: string[] }> {
  const [spells, monsters] = await Promise.all([getAllSpells(), getAllMonsters()]);
  return {
    incantesimi: spells.filter(spell => isNoSrdSource(spell.fonte_scheda)).map(spell => spell.id),
    mostri: monsters.filter(monster => isNoSrdSource(monster.fonte_scheda)).map(monster => monster.id),
  };
}
