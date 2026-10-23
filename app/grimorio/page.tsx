import { GrimorioWithFilters } from "@/components/catalog-browsers";
import { EmptyCard } from "@/components/layout/catalog-split";
import { getSpellIndex } from "@/lib/spell-index";
import { computeMeta } from "@/lib/spells-types";

export const metadata = {
  title: "Incantesimi — Cerca gli incantesimi",
};

export const revalidate = 300;

export default async function GrimorioPage() {
  const spells = await getSpellIndex();

  // Computer: the list is in the left column (components/layout/catalog-split.tsx), here the empty card.
  return (
    <>
      <div className="lg:hidden"><GrimorioWithFilters spells={spells} meta={computeMeta(spells)} /></div>
      <EmptyCard text="Scegli un incantesimo dall’elenco" />
    </>
  );
}
