import { BestiarioWithFilters } from "@/components/catalog-browsers";
import { getMonsterListIndex } from "@/lib/monster-index";

export const revalidate = 300;

export const metadata = {
  title: "Bestiario — Mostri e animali",
};

export default async function BestiarioPage() {
  const monsters = await getMonsterListIndex();

  return <BestiarioWithFilters monsters={monsters} />;
}
