import { FavoritesList } from "@/components/favorites-list";
import { getMonsterListIndex } from "@/lib/monster-index";
import { sectionsOut } from "@/lib/section-view";
import { getSpellIndex } from "@/lib/spell-index";

export const revalidate = 300;

export const metadata = {
  title: "Preferiti — Il Grimorio.App",
};

export default async function PreferitiPage() {
  // A hidden section (/admin/sezioni) leaves the list; the favorites saved on the phone stay as they are.
  const out = await sectionsOut();
  const [spells, monsters] = await Promise.all([
    out.includes("incantesimi") ? [] : getSpellIndex(),
    out.includes("bestiario") ? [] : getMonsterListIndex(),
  ]);
  return <FavoritesList spells={spells} monsters={monsters} />;
}
