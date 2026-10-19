import { FavoritesList } from "@/components/favorites-list";
import { getMonsterListIndex } from "@/lib/monster-index";
import { getSpellIndex } from "@/lib/spell-index";

export const revalidate = 300;

export const metadata = {
  title: "Preferiti — Il Grimorio.App",
};

export default async function PreferitiPage() {
  const [spells, monsters] = await Promise.all([getSpellIndex(), getMonsterListIndex()]);
  return <FavoritesList spells={spells} monsters={monsters} />;
}
