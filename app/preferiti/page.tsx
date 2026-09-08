import { FavoritesList } from "@/components/favorites-list";
import { SPELLS } from "@/lib/spells";

export const metadata = {
  title: "Preferiti — GrimorioApp",
};

export default function PreferitiPage() {
  return <FavoritesList spells={SPELLS} />;
}
