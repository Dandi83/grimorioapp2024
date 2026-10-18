import { BestiarioBrowser } from "@/components/bestiario-browser";
import { getAllMonsters } from "@/lib/monsters";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bestiario — Mostri e animali",
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
      monsters={monsters.map(({id, nome, tipo, taglia, grado_sfida, gs_num}) => ({
        id, nome, tipo, taglia, grado_sfida, gs_num,
      }))}
      initialTaglia={sp.taglia || null}
      initialTipo={sp.tipo || null}
      initialGs={sp.gs || null}
      initialRaccolta={sp.raccolta === "animali" || sp.raccolta === "mostri" ? sp.raccolta : null}
    />
  );
}
