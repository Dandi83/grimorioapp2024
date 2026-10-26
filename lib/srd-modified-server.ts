import "server-only";
import { isHomebrewId } from "./homebrew-types";
import { getAllMonsters } from "./monsters";
import { MERGED_SPELL_IDS } from "./monster-id-aliases";
import { getAllSpells } from "./spells";
import { srdModifiedCards, type SrdModifiedCard } from "./srd-modified";

/**
 * The modified SRD cards of the whole catalog, both editions, read as the public cards are (display repairs
 * included). Reserved area and /api/admin/no-srd only: never the public pages, their offline copies or /api/catalogo/*.
 */
export async function getSrdModifiedCards(): Promise<SrdModifiedCard[]> {
  const [spells, monsters] = await Promise.all([getAllSpells(), getAllMonsters()]);
  return catalogModified(spells, monsters);
}

/** The modified SRD cards among the cards of the catalog (merged duplicates and homebrew left out). */
export function catalogModified(spells: readonly { id: string }[], monsters: readonly { id: string }[]): SrdModifiedCard[] {
  return srdModifiedCards(
    spells.filter(spell => !(spell.id in MERGED_SPELL_IDS)) as unknown as Parameters<typeof srdModifiedCards>[0],
    monsters.filter(monster => !isHomebrewId(monster.id)) as unknown as Parameters<typeof srdModifiedCards>[1],
  );
}
