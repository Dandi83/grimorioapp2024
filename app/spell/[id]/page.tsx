import { inlineSpellReferences } from "@/lib/spell-references";
import { inlineConditionReferences } from "@/lib/conditions";
import Image from "next/image";
import Link from "next/link";
import { HiddenPartBar } from "@/components/sections/part-block";
import { partId, visibleLinks } from "@/lib/public-sections";
import { cardHidden, cardsOut, editionCard, linksOut } from "@/lib/section-view";
import { HiddenCardBar } from "@/components/sections/hidden-card-bar";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { FavoriteButton } from "@/components/favorite-button";
import { ShareButton } from "@/components/share-button";
import { HtmlText } from "@/components/html-text";
import { SpellSheetBody, SpellSheetHeading } from "@/components/spell-sheet";
import { getSpellById } from "@/lib/spells";
import { spellName } from "@/lib/spell-name";
import { getSpellReferenceCatalog } from "@/lib/spell-reference-catalog";
import { getSrdSource, srdSourceUrl } from "@/lib/srd-descriptions";
import { getOriginalSource } from "@/lib/original-descriptions";
import { getLegacySpellSource } from "@/lib/srd-spells-2014";
import { ReportLink } from "@/components/feedback/report-link";
import { AdminEditButton } from "@/components/admin-edit/admin-edit-button";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const { getSpellIndex } = await import("@/lib/spell-index");
  return (await getSpellIndex()).map(({ id }) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const spell = await getSpellById(id);
  if (!spell || (await cardsOut()).includes(`/spell/${spell.id}`)) return { title: "Incantesimo non trovato" };
  const titolo = spellName(spell.nome_italiano, spell.edizione);
  const description = spell.descrizione?.replace(/<[^>]+>/g, "").slice(0, 160) ||
    `${titolo}, incantesimo di ${spell.scuola}.`;
  const url = `https://ilgrimorio.app/spell/${encodeURIComponent(spell.id)}`;
  return {
    title: `${titolo} — Il Grimorio.App`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${titolo} — Il Grimorio.App`, description, url, type: "website",
      images: [{ url: "https://ilgrimorio.app/hero-libro-og.jpg", width: 1024, height: 1024, alt: titolo }],
    },
  };
}

export default async function SpellDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const spell = await getSpellById(id);
  if (!spell) notFound();

  const titolo = spellName(spell.nome_italiano, spell.edizione);
  const source = getSrdSource(spell.id, spell.descrizione);
  const original = getOriginalSource(spell.id, spell.descrizione);
  const legacySource = getLegacySpellSource(spell);
  // A card of an edition hidden from /admin/sezioni is not found; links to hidden pages stay plain text.
  const edition = spell.edizione === "2014" ? "2014" : "2024";
  const hiddenEdition = await editionCard("incantesimi", edition);
  // A card hidden with the eye of the admin area: not found for the public, labelled for the administrator.
  const hiddenCard = await cardHidden("incantesimo", spell.id);
  const out = await linksOut();
  // The display chain of every card (lib/card-display.ts): the spells of the catalog it links, without hidden pages.
  const context = { catalog: await getSpellReferenceCatalog(), hidden: out };

  return (
    <article className="spell-sheet">
      {hiddenEdition && <div className="px-6 pt-2"><HiddenPartBar id={partId("incantesimi", edition)} /></div>}
      {hiddenCard && <div className="px-6 pt-2"><HiddenCardBar kind="incantesimo" id={spell.id} /></div>}
      {/* Hero */}
      <header className="relative h-[360px] overflow-hidden">
        <Image
          src="/hero-libro.webp"
          alt=""
          fill
          priority
          sizes="(max-width: 672px) 100vw, 672px"
          className="object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(246,239,223,0.2), rgba(246,239,223,0.7), rgba(246,239,223,1))",
          }}
        />
        <BackButton fallback="/grimorio" />
        <ShareButton path={`/spell/${encodeURIComponent(spell.id)}`} title={titolo} />
        <FavoriteButton id={spell.id} />
        <div className="absolute inset-x-0 bottom-0 p-6">
          {/* «Modifica» for the administrator only, drawn in the browser (never in the cached page). */}
          <AdminEditButton target={{ kind: "incantesimo", id: spell.id, edition }} />
          <SpellSheetHeading spell={spell} context={context} />
        </div>
      </header>

      <SpellSheetBody spell={spell} context={context} />
      {original?.statBlockSummary && (
        <section className="px-6 pb-6">
          <h2 className="mb-3 font-serif text-lg font-semibold text-primary">Spirito richiamato — riepilogo</h2>
          <HtmlText html={original.statBlockSummary} damageIcons references={visibleLinks(inlineConditionReferences, out)} spellReferences={visibleLinks(inlineSpellReferences(original.statBlockSummary, false, context.catalog), out)} />
          <p className="mt-3 text-xs leading-5 text-muted">
            Riepilogo operativo: per tutti i dettagli della creatura consulta la scheda 2024 collegata qui sotto.
            Il bonus di competenza dello spirito è il tuo; le CD indicate usano la tua CD degli incantesimi.
          </p>
        </section>
      )}
      {original && (
        <aside className="mx-6 mb-6 rounded-xl border border-border bg-card p-4 text-xs leading-5 text-muted">
          <p>* Sintesi originale delle regole 2024 — {original.sourceName}. Non è una trascrizione ufficiale.</p>
          {original.statBlockUrl && (
            <p><a className="underline underline-offset-4" href={original.statBlockUrl} target="_blank" rel="noreferrer">Scheda completa dello spirito 2024</a></p>
          )}
        </aside>
      )}
      {legacySource && (
        <aside className="mx-6 mb-6 rounded-xl border border-border bg-card p-4 text-xs leading-5 text-muted">
          <p>Testo integrale: {legacySource.document} italiano — {legacySource.sourceName}.</p>
          <p>
            <a className="underline underline-offset-4" href={`${legacySource.sourceUrl}#page=${legacySource.page}`} target="_blank" rel="noreferrer">
              Fonte ufficiale, {legacySource.pages.length === 1 ? "pagina" : "pagine"} {legacySource.pages.join(", ")}
            </a>
            {" · "}<Link className="underline underline-offset-4" href="/fonti">Attribuzione e licenza</Link>
          </p>
        </aside>
      )}
      {source && (
        <aside className="mx-6 mb-6 rounded-xl border border-border bg-card p-4 text-xs leading-5 text-muted">
          <p>Testo integrale: SRD 5.2.1 italiano — {source.sourceName}.</p>
          <p>
            <a className="underline underline-offset-4" href={`${srdSourceUrl}#page=${source.pages[0]}`} target="_blank" rel="noreferrer">
              Fonte ufficiale, {source.pages.length === 1 ? "pagina" : "pagine"} {source.pages.join(", ")}
            </a>
            {" · "}<Link className="underline underline-offset-4" href="/fonti">Attribuzione e licenza</Link>
          </p>
        </aside>
      )}

      <ReportLink edition={spell.edizione === "2014" ? "2014" : "2024"} />
    </article>
  );
}
