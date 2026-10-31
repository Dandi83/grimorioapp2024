import "server-only";
import { isNoSrdSource } from "./card-display";
import { getAllMonsters } from "./monsters";
import { typeCategory } from "./monsters-types";
import type { SearchEnglishKind } from "./search-english";
import { getAdminSpells } from "./spells";
import { parseLivello } from "./spells-types";
import { usesLegacyMonsterRules } from "./srd-monsters";

/**
 * The NO SRD cards of «Nomi inglesi da verificare» (PROMPT 37/38), keyed «kind:id»: the Italian name, the edition and
 * what the lists say of them («Invocazione · liv. 3», «Aberrazione · GS 14»), so two cards with the same name
 * (Manto del crociato 2014 and 2024) are told apart. Reserved area only.
 */
export interface SearchEnglishCard { nome: string; href: string; edizione: "2014" | "2024"; etichetta: string }

export const spellLabel = (livello: string | null | undefined) => {
  const { scuola, livello_num } = parseLivello(livello || "");
  return [scuola, livello_num === 0 ? "trucchetto" : livello_num > 0 ? `liv. ${livello_num}` : ""].filter(Boolean).join(" · ");
};
export const monsterLabel = (tipo: string | null | undefined, gs: string | null | undefined) =>
  [typeCategory(tipo || "") || tipo || "", gs ? `GS ${gs}` : ""].filter(Boolean).join(" · ");

export async function noSrdCards(): Promise<Map<string, SearchEnglishCard>> {
  const [spells, monsters] = await Promise.all([getAdminSpells(), getAllMonsters()]);
  const cards = new Map<string, SearchEnglishCard>();
  for (const spell of spells) if (isNoSrdSource(spell.origine ?? spell.fonte_scheda)) cards.set(`incantesimo:${spell.id}`, {
    nome: spell.nome_mostrato ?? spell.nome_italiano, href: `/admin/incantesimi/${encodeURIComponent(spell.id)}`,
    edizione: spell.edizione === "2014" ? "2014" : "2024", etichetta: spellLabel(spell.livello),
  });
  for (const monster of monsters) if (isNoSrdSource(monster.fonte_scheda)) cards.set(`mostro:${monster.id}`, {
    nome: monster.nome, href: `/admin/mostri/${encodeURIComponent(monster.id)}`,
    edizione: usesLegacyMonsterRules(monster) ? "2014" : "2024", etichetta: monsterLabel(monster.tipo, monster.grado_sfida),
  });
  return cards;
}

export async function noSrdCard(kind: SearchEnglishKind, id: string): Promise<SearchEnglishCard | undefined> {
  return (await noSrdCards()).get(`${kind}:${id}`);
}
