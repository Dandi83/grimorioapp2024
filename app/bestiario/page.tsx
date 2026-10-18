import { BestiarioBrowser } from "@/components/bestiario-browser";
import { getAllMonsters, computeMonstersMeta } from "@/lib/monsters";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mostri — Cerca i mostri",
};

export default async function BestiarioPage({
  searchParams,
}: {
  searchParams: Promise<{ taglia?: string; tipo?: string; gs?: string; raccolta?: string }>;
}) {
  const sp = await searchParams;
  const monsters = await getAllMonsters();

  return (
    <BestiarioBrowser
      showCollections={(process.env.VERCEL_ENV === "preview" || process.env.VERCEL_ENV === "production")}
      monsters={monsters}
      meta={computeMonstersMeta(monsters)}
      initialTaglia={sp.taglia || null}
      initialTipo={sp.tipo || null}
      initialGs={sp.gs || null}
      initialRaccolta={sp.raccolta === "animali" || sp.raccolta === "mostri" ? sp.raccolta : null}
    />
  );
}
