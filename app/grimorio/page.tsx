import { GrimorioBrowser } from "@/components/grimorio-browser";
import { getAllSpells, computeMeta } from "@/lib/spells";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Grimorio — Cerca gli incantesimi",
};

export default async function GrimorioPage({
  searchParams,
}: {
  searchParams: Promise<{ scuola?: string; livello?: string; classe?: string }>;
}) {
  const sp = await searchParams;
  const spells = await getAllSpells();
  const livello =
    sp.livello !== undefined && sp.livello !== ""
      ? parseInt(sp.livello, 10)
      : null;

  return (
    <GrimorioBrowser
      spells={spells}
      meta={computeMeta(spells)}
      initialLivello={Number.isNaN(livello as number) ? null : livello}
      initialScuola={sp.scuola || null}
      initialClasse={sp.classe || null}
    />
  );
}
