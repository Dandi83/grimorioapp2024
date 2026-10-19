import { GrimorioBrowser } from "@/components/grimorio-browser";
import { getSpellIndex } from "@/lib/spell-index";
import { computeMeta } from "@/lib/spells-types";

export const metadata = {
  title: "Incantesimi — Cerca gli incantesimi",
};

export default async function GrimorioPage({
  searchParams,
}: {
  searchParams: Promise<{ scuola?: string; livello?: string; classe?: string }>;
}) {
  const sp = await searchParams;
  const spells = await getSpellIndex();
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
