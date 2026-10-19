import { BestiarioWithFilters } from "@/components/catalog-browsers";
import { getAllMonsters } from "@/lib/monsters";

export const revalidate = 300;

export const metadata = {
  title: "Bestiario — Mostri e animali",
};

export default async function BestiarioPage() {
  const monsters = await getAllMonsters();

  return (
    <BestiarioWithFilters
      monsters={monsters.map(({id, nome, tipo, taglia, grado_sfida, gs_num}) => ({
        id, nome, tipo, taglia, grado_sfida, gs_num,
      }))}
    />
  );
}
