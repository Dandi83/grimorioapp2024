import { FavoritesList } from "@/components/favorites-list";
import { sectionView } from "@/lib/section-view";

export const revalidate = 300;

export const metadata = {
  title: "Preferiti — Il Grimorio.App",
};

/**
 * Preferiti (PROMPT 43): a light page, without the catalog. The list asks only the cards saved on the device
 * (app/preferiti/schede/route.ts, same rules of hidden sections, editions, collections and cards as before).
 */
export default async function PreferitiPage() {
  return <FavoritesList unavailable={!(await sectionView()).admin} />;
}
