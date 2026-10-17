import { FavoritesList } from "@/components/favorites-list";
import { getAllMonsters } from "@/lib/monsters";
import { getAllSpells } from "@/lib/spells";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Preferiti — GrimorioApp",
};

export default async function PreferitiPage() {
  const [spells, monsters] = await Promise.all([getAllSpells(), getAllMonsters()]);
  return <FavoritesList spells={spells} monsters={monsters} />;
}
