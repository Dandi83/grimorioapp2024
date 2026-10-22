import { notFound } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { FavoriteButton } from "@/components/favorite-button";
import { ShareButton } from "@/components/share-button";
import { MonsterProvenanceBadge } from "@/components/monster-provenance-badge";
import { getMonsterById } from "@/lib/monsters";
import { getSrdMonsterSource, usesLegacyMonsterRules } from "@/lib/srd-monsters";
import Link from "next/link";
import { HiddenPartBar } from "@/components/sections/part-block";
import { partId } from "@/lib/public-sections";
import { editionCard, linksOut, partState } from "@/lib/section-view";
import { isSrdAnimal } from "@/lib/monsters-types";

import { MonsterSheetBody, MonsterSheetTitle } from "@/components/monster-sheet";
import { ReportLink } from "@/components/feedback/report-link";

/** A creature of a hidden collection (Mostri, Animali) is not found; true when the administrator sees it hidden. */
async function collectionCard(collection: "mostri" | "animali"): Promise<boolean> {
  const state = await partState("bestiario", collection);
  if (!state.shown) notFound();
  return state.hidden;
}

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const { getMonsterIdIndex } = await import("@/lib/monster-index");
  return (await getMonsterIdIndex()).map(({ id }) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const monster = await getMonsterById(id);
  if (!monster) return { title: "Mostro non trovato" };
  const description = monster.descrizione?.replace(/<[^>]+>/g, "").slice(0, 160) ||
    `${monster.nome}, ${monster.tipo}.`;
  const url = `https://ilgrimorio.app/mostro/${encodeURIComponent(monster.id)}`;
  return {
    title: `${monster.nome} — Bestiario Il Grimorio.App`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${monster.nome} — Il Grimorio.App`, description, url, type: "website",
      images: [],
    },
  };
}

export default async function MonsterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const monster = await getMonsterById(id);
  if (!monster) notFound();
  const source = getSrdMonsterSource(monster);
  const legacy = usesLegacyMonsterRules(monster);
  // A creature of an edition or a collection hidden from /admin/sezioni is not found (the administrator sees it, labelled).
  const edition = monster.edizione === "2014" || (!monster.edizione && legacy) ? "2014" : "2024";
  const collection = isSrdAnimal(monster) ? "animali" : "mostri";
  const hiddenParts = [...(await editionCard("bestiario", edition) ? [partId("bestiario", edition)] : []), ...(await collectionCard(collection) ? [partId("bestiario", collection)] : [])];

  return (
    <article className="monster-sheet relative pb-2 pt-4">
      {hiddenParts.map(id => <div key={id} className="px-6"><HiddenPartBar id={id} /></div>)}
      <MonsterSheetTitle
        monster={monster}
        before={
          <div className="flex min-h-11 items-center justify-between pb-2">
            <BackButton fallback="/bestiario" label="Bestiario" />
            <div className="flex items-center">
              <ShareButton inline path={`/mostro/${encodeURIComponent(monster.id)}`} title={monster.nome} />
              <FavoriteButton inline id={`mostro:${monster.id}`} />
            </div>
          </div>
        }
        label={<MonsterProvenanceBadge source={source} edition={monster.edizione ?? (legacy ? "2014" : undefined)} linked variant="dark" />}
      />
      <MonsterSheetBody monster={monster} legacy={legacy} hidden={await linksOut()} />
      {source && (
        <aside aria-label="Fonte della scheda" className="mx-6 mb-8 rounded-xl border border-border bg-card p-4 text-sm leading-6 text-muted">
          <p>Testo integrale: {source.document} italiano — {source.sourceName}.</p>
          {source.adaptation && <p>{source.adaptation}</p>}
          {source.pages.length > 1 && <p>Pagine della fonte: {source.pages.join(", ")}.</p>}
          <a className="underline underline-offset-4" href={`${source.sourceUrl}#page=${source.page}`} target="_blank" rel="noreferrer">Fonte ufficiale, pagina {source.page}</a>
          {" · "}
          <Link className="underline underline-offset-4" href="/fonti">Attribuzione e licenza</Link>
        </aside>
      )}

      <ReportLink edition={monster.edizione ?? (legacy ? "2014" : "2024")} />
    </article>
  );
}
