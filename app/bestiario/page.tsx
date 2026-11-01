import { Breadcrumbs } from "@/components/seo/json-ld";
import { pageMetadata } from "@/lib/seo";
import { BestiarioWithFilters } from "@/components/catalog-browsers";
import { EmptyCard } from "@/components/layout/catalog-split";
import { getMonsterListIndex } from "@/lib/monster-index";
import { bestiaryList, visibleCards, sectionPage } from "@/lib/section-view";

export const revalidate = 300;

export const metadata = pageMetadata({ name: "Bestiario", path: "/bestiario",
  description: "Mostri e animali di D&D 5e in italiano, edizioni 2014 e 2024: cerca per nome e filtra per tipo, taglia, grado di sfida e habitat." });

export default async function BestiarioPage() {
  // Before anything of the page: the gate of the layout runs in parallel and cannot stop what the page streams.
  await sectionPage("bestiario");
  // Cards hidden with the eye of the admin area: out for the public, labelled for the administrator.
  const monsters = await bestiaryList(await visibleCards("mostro", await getMonsterListIndex()));

  // Computer: the list is in the left column (components/layout/catalog-split.tsx), here the empty card.
  return (
    <>
      <Breadcrumbs crumbs={[{ name: "Bestiario", path: "/bestiario" }]} />
      <div className="lg:hidden"><BestiarioWithFilters monsters={monsters} /></div>
      <EmptyCard text="Scegli una creatura dall’elenco" />
    </>
  );
}
