import { FavoritesList } from "@/components/favorites-list";
import { getMonsterListIndex } from "@/lib/monster-index";
import { isSrdAnimal } from "@/lib/monsters-types";
import { partsOut, sectionsOut } from "@/lib/section-view";
import { getSpellIndex } from "@/lib/spell-index";

export const revalidate = 300;

export const metadata = {
  title: "Preferiti — Il Grimorio.App",
};

export default async function PreferitiPage() {
  // Hidden sections, editions and collections (/admin/sezioni) leave the list; the favorites saved on the phone stay as they are.
  const [out, parts] = await Promise.all([sectionsOut(), partsOut()]);
  const shown = (section: string, part: string | undefined) => !part || !parts.includes(`${section}:${part}`);
  const [spells, monsters] = await Promise.all([
    out.includes("incantesimi") ? [] : getSpellIndex(),
    out.includes("bestiario") ? [] : getMonsterListIndex(),
  ]);
  return (
    <FavoritesList
      spells={parts.length ? spells.filter(spell => shown("incantesimi", spell.edizione ?? "2024")) : spells}
      monsters={parts.length ? monsters.filter(monster => shown("bestiario", monster.edizione) && shown("bestiario", isSrdAnimal(monster) ? "animali" : "mostri")) : monsters}
    />
  );
}
