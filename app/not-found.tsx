import { NotFoundView } from "@/components/sections/section-unavailable";
import { sectionParts } from "@/lib/public-sections";
import { sectionView } from "@/lib/section-view";

export const metadata = { title: "Pagina non disponibile — Il Grimorio.App", robots: { index: false, follow: false } };

/**
 * 404 of the whole site: the pages of a hidden section, and the cards of a hidden edition or collection
 * (a section with such a part hidden), say they will come back (lib/public-sections.ts).
 */
export default async function NotFound() {
  const { hidden, hiddenParts } = await sectionView();
  const withHiddenCards = [...new Set(hiddenParts.map(id => id.split(":")[0]))]
    .filter(section => sectionParts(section).some(part => part.set && part.set !== "blocchi" && hiddenParts.includes(`${section}:${part.key}`)));
  return <NotFoundView hidden={[...hidden, ...withHiddenCards]} />;
}
