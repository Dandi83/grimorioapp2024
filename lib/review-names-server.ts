import "server-only";
import { adminEditHref } from "./admin-edit-link";
import { isNoSrdSource } from "./card-display";
import { homebrewMonster, publishedHomebrew } from "./homebrew";
import { MERGED_SPELL_IDS } from "./monster-id-aliases";
import { getAllMonsters } from "./monsters";
import { reviewNamesIn, cardTexts } from "./review-names";
import { cardPath, hiddenCardPaths } from "./section-visibility";
import { getAllSpells } from "./spells";
import { spellName } from "./spell-name";

/**
 * «Nomi da rivedere»: the NO SRD spells and creatures (added here, original summaries, published homebrew), both
 * editions, whose name or text holds a name of lib/data/nomi-da-rivedere.json. Read on every request, so cards added
 * later are included at once. Reserved area only: never the public pages, their offline copies, /api/catalogo/* or
 * the browser code.
 */
export interface ReviewNameCard {
  kind: "incantesimo" | "mostro";
  id: string;
  name: string;
  edition: "2014" | "2024";
  source: string;
  hidden: boolean;
  href: string;
  editHref: string;
  found: string[];
}

const edition = (value: unknown): "2014" | "2024" => (value === "2014" ? "2014" : "2024");

export async function getReviewNameCards(): Promise<ReviewNameCard[]> {
  const [spells, monsters, homebrew, hidden] = await Promise.all([
    getAllSpells(), getAllMonsters(), publishedHomebrew().catch(() => []), hiddenCardPaths().catch(() => [] as string[]),
  ]);
  const hiddenPaths = new Set(hidden);
  const cards: ReviewNameCard[] = [];
  const add = (kind: "incantesimo" | "mostro", card: { id: string; fonte_scheda?: string; edizione?: unknown }, name: string) => {
    const found = reviewNamesIn(cardTexts(card));
    if (!found.length) return;
    const cardEdition = edition(card.edizione);
    cards.push({
      kind, id: card.id, name, edition: cardEdition, source: card.fonte_scheda ?? "",
      hidden: hiddenPaths.has(cardPath(kind, card.id)), href: cardPath(kind, card.id),
      editHref: adminEditHref({ kind, id: card.id, edition: cardEdition }), found,
    });
  };
  for (const spell of spells) {
    if (spell.id in MERGED_SPELL_IDS || !isNoSrdSource(spell.fonte_scheda)) continue;
    add("incantesimo", spell, spellName(spell.nome_italiano, spell.edizione));
  }
  for (const monster of monsters) if (isNoSrdSource(monster.fonte_scheda)) add("mostro", monster, monster.nome);
  for (const row of homebrew) {
    const monster = homebrewMonster(row);
    add("mostro", { ...monster, fonte_scheda: "Homebrew" }, monster.nome);
  }
  return cards.sort((a, b) => a.name.localeCompare(b.name, "it") || a.edition.localeCompare(b.edition));
}
