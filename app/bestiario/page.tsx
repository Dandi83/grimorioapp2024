import { BestiarioBrowser } from "@/components/bestiario-browser";
import { getAllMonsters, computeMonstersMeta } from "@/lib/monsters";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bestiario — Cerca i mostri",
};

export default async function BestiarioPage({
  searchParams,
}: {
  searchParams: Promise<{ taglia?: string; tipo?: string; gs?: string }>;
}) {
  const sp = await searchParams;
  const monsters = await getAllMonsters();

  return (
    <BestiarioBrowser
      monsters={monsters}
      meta={computeMonstersMeta(monsters)}
      initialTaglia={sp.taglia || null}
      initialTipo={sp.tipo || null}
      initialGs={sp.gs || null}
    />
  );
}
