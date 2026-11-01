import { NextResponse } from "next/server";

import { getMonsterListIndex } from "@/lib/monster-index";
import { collectionOf } from "@/lib/monsters-types";
import { markedCards, partsOut, sectionsOut } from "@/lib/section-view";
import { getSpellIndex } from "@/lib/spell-index";

export const dynamic = "force-dynamic";

const MAX_IDS = 500;
const ids = (value: string | null) => [...new Set((value ?? "").split(",").map(id => id.trim()).filter(id => id && id.length <= 120))].slice(0, MAX_IDS);

/**
 * Preferiti (PROMPT 43): only the cards saved on this device, asked by id (s: spells, m: creatures), with the same rules
 * the page had when it carried the whole catalog: hidden sections, editions and collections left out for the public,
 * a single hidden card kept and marked (dimmed, «Non disponibile al momento»), everything for the administrator.
 * Nothing is asked by a device without favorites. Never stored by a cache: the answer depends on the session.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const spellIds = new Set(ids(params.get("s")));
  const monsterIds = new Set(ids(params.get("m")));
  const [out, parts] = await Promise.all([sectionsOut(), partsOut()]);
  const shown = (section: string, part: string | undefined) => !part || !parts.includes(`${section}:${part}`);
  const [spells, monsters] = await Promise.all([
    out.includes("incantesimi") || !spellIds.size ? [] : getSpellIndex(),
    out.includes("bestiario") || !monsterIds.size ? [] : getMonsterListIndex(),
  ]);
  const savedSpells = spells.filter(spell => spellIds.has(spell.id) && shown("incantesimi", spell.edizione ?? "2024"));
  const savedMonsters = monsters.filter(monster => monsterIds.has(monster.id)
    && (shown("bestiario", monster.edizione) || (!!monster.entrambe && shown("bestiario", "2014"))) && shown("bestiario", collectionOf(monster)));
  return NextResponse.json(
    { spells: await markedCards("incantesimo", savedSpells), monsters: await markedCards("mostro", savedMonsters) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
