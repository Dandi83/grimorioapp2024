import { BestiarioWithFilters } from "@/components/catalog-browsers";
import { EmptyCard } from "@/components/layout/catalog-split";
import { getMonsterListIndex } from "@/lib/monster-index";
import { bestiaryList, visibleCards } from "@/lib/section-view";

export const revalidate = 300;

export const metadata = {
  title: "Bestiario — Mostri e animali",
};

export default async function BestiarioPage() {
  // Cards hidden with the eye of the admin area: out for the public, labelled for the administrator.
  const monsters = await bestiaryList(await visibleCards("mostro", await getMonsterListIndex()));

  // Computer: the list is in the left column (components/layout/catalog-split.tsx), here the empty card.
  return (
    <>
      <div className="lg:hidden"><BestiarioWithFilters monsters={monsters} /></div>
      <EmptyCard text="Scegli una creatura dall’elenco" />
    </>
  );
}
