import { GrimorioWithFilters } from "@/components/catalog-browsers";
import { EmptyCard } from "@/components/layout/catalog-split";
import { visibleCards, sectionPage } from "@/lib/section-view";
import { getSpellIndex } from "@/lib/spell-index";
import { computeMeta } from "@/lib/spells-types";

export const metadata = {
  title: "Incantesimi — Cerca gli incantesimi",
};

export const revalidate = 300;

export default async function GrimorioPage() {
  // Before anything of the page: the gate of the layout runs in parallel and cannot stop what the page streams.
  await sectionPage("incantesimi");
  // Cards hidden with the eye of the admin area: out for the public, labelled for the administrator.
  const spells = await visibleCards("incantesimo", await getSpellIndex());

  // Computer: the list is in the left column (components/layout/catalog-split.tsx), here the empty card.
  return (
    <>
      <div className="lg:hidden"><GrimorioWithFilters spells={spells} meta={computeMeta(spells)} /></div>
      <EmptyCard text="Scegli un incantesimo dall’elenco" />
    </>
  );
}
