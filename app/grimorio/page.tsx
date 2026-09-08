import { GrimorioBrowser } from "@/components/grimorio-browser";
import { getMeta, SPELLS } from "@/lib/spells";

export const metadata = {
  title: "Grimorio — Cerca gli incantesimi",
};

export default async function GrimorioPage({
  searchParams,
}: {
  searchParams: Promise<{ scuola?: string; livello?: string; classe?: string }>;
}) {
  const sp = await searchParams;
  const livello =
    sp.livello !== undefined && sp.livello !== ""
      ? parseInt(sp.livello, 10)
      : null;

  return (
    <GrimorioBrowser
      spells={SPELLS}
      meta={getMeta()}
      initialLivello={Number.isNaN(livello as number) ? null : livello}
      initialScuola={sp.scuola || null}
      initialClasse={sp.classe || null}
    />
  );
}
