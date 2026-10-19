import { FavoritesList } from "@/components/favorites-list";
import { getAllMonsters } from "@/lib/monsters";
import { getSpellIndex } from "@/lib/spell-index";

export const revalidate = 300;

export const metadata = {
  title: "Preferiti — GrimorioApp",
};

export default async function PreferitiPage() {
  const [spells, monsters] = await Promise.all([getSpellIndex(), getAllMonsters()]);
  return <FavoritesList spells={spells} monsters={monsters.map(({id, nome, tipo, taglia, grado_sfida, gs_num}) => ({
    id, nome, tipo, taglia, grado_sfida, gs_num,
  }))} />;
}
