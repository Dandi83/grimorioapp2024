import { FavoritesList } from "@/components/favorites-list";
import { getMonsterListIndex } from "@/lib/monster-index";
import { collectionOf } from "@/lib/monsters-types";
import { markedCards, partsOut, sectionView, sectionsOut } from "@/lib/section-view";
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
  // A single hidden card (the eye of the admin area) stays, marked: dimmed and without its link for the public.
  return (
    <FavoritesList
      spells={await markedCards("incantesimo", parts.length ? spells.filter(spell => shown("incantesimi", spell.edizione ?? "2024")) : spells)}
      monsters={await markedCards("mostro", parts.length ? monsters.filter(monster => (shown("bestiario", monster.edizione) || (!!monster.entrambe && shown("bestiario", "2014"))) && shown("bestiario", collectionOf(monster))) : monsters)}
      unavailable={!(await sectionView()).admin}
    />
  );
}
