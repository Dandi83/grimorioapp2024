import { notFound } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { FavoriteButton } from "@/components/favorite-button";
import { ShareButton } from "@/components/share-button";
import { MonsterProvenanceBadge } from "@/components/monster-provenance-badge";
import { getMonsterById } from "@/lib/monsters";
import { getSrdMonsterSource, usesLegacyMonsterRules } from "@/lib/srd-monsters";
import Link from "next/link";
import { AdminEditButton } from "@/components/admin-edit/admin-edit-button";
import { AdminMonsterPanel } from "@/components/admin-edit/admin-monster-panel";
import { balanceApplies } from "@/lib/balance-scope";
import { HiddenPartBar } from "@/components/sections/part-block";
import { partId } from "@/lib/public-sections";
import { cardHidden, editionCard, linksOut, partState, sectionPage, CLOSED_METADATA, sectionClosed } from "@/lib/section-view";
import { HiddenCardBar } from "@/components/sections/hidden-card-bar";
import { collectionOf } from "@/lib/monsters-types";
import { HomebrewByline, HomebrewLabel, HomebrewNote } from "@/components/homebrew/homebrew-sheet";

import { MonsterSheetBody, MonsterSheetTitle } from "@/components/monster-sheet";
import { getSpellReferenceCatalog } from "@/lib/spell-reference-catalog";
import { ReportLink } from "@/components/feedback/report-link";
import { CardOriginBox } from "@/components/card-origin-box";

/** A creature of a hidden collection (Mostri, Animali) is not found; true when the administrator sees it hidden. */
async function collectionCard(collection: "mostri" | "animali" | "homebrew"): Promise<boolean> {
  const state = await partState("bestiario", collection);
  if (!state.shown) notFound();
  return state.hidden;
}

/** Both editions of a homebrew «Entrambe»: not found only when both are hidden; the hidden ones for the administrator. */
async function bothEditionsCard(): Promise<string[]> {
  const states = await Promise.all((["2024", "2014"] as const).map(async edition => ({ edition, ...await partState("bestiario", edition) })));
  if (states.every(state => !state.shown)) notFound();
  return states.filter(state => state.hidden && states.every(other => other.hidden)).map(state => partId("bestiario", state.edition));
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
  // Hidden or «In arrivo»: no name or description of the card in the answer.
  if (await sectionClosed("bestiario")) return CLOSED_METADATA;
  const { id } = await params;
  const monster = await getMonsterById(id);
  // The same checks as the page (missing, hidden with the eye, of a hidden edition or collection): not found,
  // with the generic metadata of the site's 404.
  if (!monster) notFound();
  await cardHidden("mostro", monster.id);
  if (monster.homebrew_edizione === "entrambe") await bothEditionsCard();
  else await editionCard("bestiario", monster.edizione === "2014" || (!monster.edizione && usesLegacyMonsterRules(monster)) ? "2014" : "2024");
  await collectionCard(collectionOf({ id: monster.id, homebrew: monster.homebrew_edizione }));
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
  // Before anything of the page: the gate of the layout runs in parallel and cannot stop what the page streams.
  await sectionPage("bestiario");
  const { id } = await params;
  const monster = await getMonsterById(id);
  if (!monster) notFound();
  const source = getSrdMonsterSource(monster);
  const legacy = usesLegacyMonsterRules(monster);
  // A creature of an edition or a collection hidden from /admin/sezioni is not found (the administrator sees it, labelled).
  const edition = monster.edizione === "2014" || (!monster.edizione && legacy) ? "2014" : "2024";
  const collection = collectionOf({ id: monster.id, homebrew: monster.homebrew_edizione });
  // A homebrew for both editions is not found only when both are hidden.
  const both = monster.homebrew_edizione === "entrambe";
  // A card hidden with the eye of the admin area: not found for the public, labelled for the administrator.
  const hiddenCard = await cardHidden("mostro", monster.id);
  const editionHidden = both ? await bothEditionsCard() : await editionCard("bestiario", edition) ? [partId("bestiario", edition)] : [];
  const hiddenParts = [...editionHidden, ...(await collectionCard(collection) ? [partId("bestiario", collection)] : [])];
  const homebrew = monster.homebrew_edizione !== undefined;

  return (
    <article className="monster-sheet relative pb-2 pt-4">
      {hiddenParts.map(id => <div key={id} className="px-6"><HiddenPartBar id={id} /></div>)}
      {hiddenCard && <div className="px-6"><HiddenCardBar kind="mostro" id={monster.id} /></div>}
      <MonsterSheetTitle
        monster={monster}
        before={
          <div className="flex min-h-11 items-center justify-between pb-2">
            {/* «I mostri creati da voi»: back to the section (PROMPT 13). */}
            {homebrew ? <BackButton fallback="/bestiario/creati-da-voi" label="I mostri creati da voi" /> : <BackButton fallback="/bestiario" label="Bestiario" />}
            <div className="flex items-center">
              {/* «Modifica» for the administrator only, drawn in the browser (never in the cached page). */}
              <AdminEditButton target={{ kind: "mostro", id: monster.id, edition: homebrew ? (monster.homebrew_edizione === "entrambe" ? undefined : monster.homebrew_edizione) : legacy ? "2014" : "2024" }} desktop="lg:static lg:mr-2" />
              <ShareButton inline path={`/mostro/${encodeURIComponent(monster.id)}`} title={monster.nome} />
              <FavoriteButton inline id={`mostro:${monster.id}`} />
            </div>
          </div>
        }
        // «I mostri creati da voi»: the pill next to the edition label, where the sheets show their labels.
        label={homebrew ? <HomebrewLabel edizione={monster.homebrew_edizione!} ours={!monster.homebrew_autore} /> : <MonsterProvenanceBadge source={source} edition={monster.edizione ?? (legacy ? "2014" : undefined)} linked variant="dark" />}
        byline={homebrew ? <HomebrewByline autore={monster.homebrew_autore} licenza={monster.homebrew_licenza} /> : undefined}
      />
      <MonsterSheetBody monster={monster} legacy={legacy} hidden={await linksOut()} catalog={await getSpellReferenceCatalog()} />
      {/* The administrator's box under the sheet (PROMPT 11), asked for in the browser after the session check: never in this HTML. */}
      {balanceApplies(monster) && <AdminMonsterPanel id={monster.id} />}
      {source && (
        <aside aria-label="Fonte della scheda" data-source-box="" className="mx-6 mb-8 rounded-xl border border-border bg-card p-4 text-sm leading-6 text-muted">
          <p>Testo integrale: {source.document} italiano — {source.sourceName}.</p>
          {source.adaptation && <p>{source.adaptation}</p>}
          {source.pages.length > 1 && <p>Pagine della fonte: {source.pages.join(", ")}.</p>}
          <a className="underline underline-offset-4" href={`${source.sourceUrl}#page=${source.page}`} target="_blank" rel="noreferrer">Fonte ufficiale, pagina {source.page}</a>
          {" · "}
          <Link className="underline underline-offset-4" href="/fonti">Attribuzione e licenza</Link>
        </aside>
      )}
      {/* NO SRD: where the sheet comes from, in the place of the SRD source (homebrew keeps its licence box). */}
      <CardOriginBox source={monster.fonte_scheda} className="mx-6 mb-8" />

      {homebrew && <HomebrewNote />}

      <ReportLink edition={monster.edizione ?? (legacy ? "2014" : "2024")} />
    </article>
  );
}
