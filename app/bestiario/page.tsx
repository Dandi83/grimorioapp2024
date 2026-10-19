import { Suspense } from "react";
import { BestiarioWithFilters } from "@/components/catalog-browsers";
import { CatalogLoading } from "@/components/catalog-loading";
import { getAllMonsters } from "@/lib/monsters";

export const revalidate = 300;

export const metadata = {
  title: "Bestiario — Mostri e animali",
};

export default async function BestiarioPage() {
  const monsters = await getAllMonsters();

  return (
    <Suspense fallback={<CatalogLoading title="Bestiario" />}>
      <BestiarioWithFilters
        monsters={monsters.map(({id, nome, tipo, taglia, grado_sfida, gs_num}) => ({
          id, nome, tipo, taglia, grado_sfida, gs_num,
        }))}
      />
    </Suspense>
  );
}
