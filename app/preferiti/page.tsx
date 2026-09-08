import { FavoritesList } from "@/components/favorites-list";
import { getAllSpells } from "@/lib/spells";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Preferiti — GrimorioApp",
};

export default async function PreferitiPage() {
  const spells = await getAllSpells();
  return <FavoritesList spells={spells} />;
}
