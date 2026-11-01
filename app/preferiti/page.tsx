import { pageMetadata } from "@/lib/seo";
import { FavoritesList } from "@/components/favorites-list";
import { sectionView } from "@/lib/section-view";

export const revalidate = 300;

// Saved on each device: nothing to find on Google (noindex, links followed); never in the sitemap.
export const metadata = {
  ...pageMetadata({ name: "Preferiti", path: "/preferiti",
    description: "I tuoi incantesimi e mostri preferiti, salvati su questo dispositivo per ritrovarli al volo durante la partita su Il Grimorio.App." }),
  robots: { index: false, follow: true },
};

/**
 * Preferiti (PROMPT 43): a light page, without the catalog. The list asks only the cards saved on the device
 * (app/preferiti/schede/route.ts, same rules of hidden sections, editions, collections and cards as before).
 */
export default async function PreferitiPage() {
  return <FavoritesList unavailable={!(await sectionView()).admin} />;
}
