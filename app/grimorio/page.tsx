import { Suspense } from "react";
import { GrimorioWithFilters } from "@/components/catalog-browsers";
import { CatalogLoading } from "@/components/catalog-loading";
import { getSpellIndex } from "@/lib/spell-index";
import { computeMeta } from "@/lib/spells-types";

export const metadata = {
  title: "Incantesimi — Cerca gli incantesimi",
};

export const revalidate = 300;

export default async function GrimorioPage() {
  const spells = await getSpellIndex();

  return (
    <Suspense fallback={<CatalogLoading title="Incantesimi" />}>
      <GrimorioWithFilters spells={spells} meta={computeMeta(spells)} />
    </Suspense>
  );
}
