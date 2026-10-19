import { inlineSpellReferences } from "@/lib/spell-references";
import { inlineConditionReferences } from "@/lib/conditions";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { FavoriteButton } from "@/components/favorite-button";
import { ShareButton } from "@/components/share-button";
import { HtmlText } from "@/components/html-text";
import { SpellProvenanceMarker } from "@/components/spell-provenance-marker";
import { RulesEditionBadge } from "@/components/rules-edition-badge";
import { capitalizeWords, getSpellById } from "@/lib/spells";
import { schoolColor } from "@/lib/school-colors";
import { getSrdSource, srdSourceUrl } from "@/lib/srd-descriptions";
import { getOriginalSource } from "@/lib/original-descriptions";

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
  if (!spell) return { title: "Incantesimo non trovato" };
  const titolo = capitalizeWords(spell.nome_italiano);
  const description = spell.descrizione?.replace(/<[^>]+>/g, "").slice(0, 160) ||
    `${titolo}, incantesimo di ${spell.scuola}.`;
  const url = `https://ilgrimorio.app/spell/${encodeURIComponent(spell.id)}`;
  return {
    title: `${titolo} — GrimorioApp`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${titolo} — Il Grimorio.App`, description, url, type: "website",
      images: [{ url: "https://ilgrimorio.app/hero-libro.png", alt: titolo }],
    },
  };
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="w-[calc(50%-6px)] rounded-xl border border-border bg-card p-3">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="font-serif text-[15px] leading-5 text-foreground">
        {value || "—"}
      </p>
    </div>
  );
}

export default async function SpellDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const spell = await getSpellById(id);
  if (!spell) notFound();

  const color = schoolColor(spell.scuola);
  const titolo = capitalizeWords(spell.nome_italiano);
  const badge =
    spell.livello_num === 0
      ? `Trucchetto · ${spell.scuola}`
      : `${spell.livello_num}° Livello · ${spell.scuola}`;
  const source = getSrdSource(spell.id, spell.descrizione);
  const original = getOriginalSource(spell.id, spell.descrizione);

  return (
    <article className="spell-sheet">
      {/* Hero */}
      <header className="relative h-[360px] overflow-hidden">
        <Image
          src="/hero-libro.png"
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
              "linear-gradient(to bottom, rgba(10,10,11,0.3), rgba(10,10,11,0.55), rgba(10,10,11,1))",
          }}
        />
        <BackButton />
        <ShareButton path={`/spell/${encodeURIComponent(spell.id)}`} title={titolo} />
        <FavoriteButton id={spell.id} />
        <div className="absolute inset-x-0 bottom-0 p-6">
          <span
            className="mb-3 inline-flex items-center gap-2 rounded-full border bg-elevated/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground"
            style={{ borderColor: color }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            {badge}
          </span>
          <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-foreground text-balance">
            {titolo}
            <SpellProvenanceMarker id={spell.id} />
          </h1>
          <RulesEditionBadge edition={spell.edizione} />
        </div>
      </header>

      {/* Metadata grid */}
      <div className="flex flex-wrap gap-3 p-6">
        <MetaCell label="Tempo di lancio" value={spell.tempo_di_lancio} />
        <MetaCell label="Gittata" value={spell.gittata} />
        <MetaCell label="Componenti" value={spell.componenti} />
        <MetaCell label="Durata" value={spell.durata} />
      </div>

      {/* Classes */}
      {spell.classi.length > 0 && (
        <section className="mb-4 px-6">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-primary">
            Classi
          </h2>
          <div className="flex flex-wrap gap-2">
            {spell.classi.map((c) => (
              <span
                key={c}
                className="rounded-full border border-primary-dim bg-primary-faint px-3 py-1.5 text-xs font-semibold text-primary"
              >
                {capitalizeWords(c)}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Description */}
      <section className="px-6 pb-4">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-primary">
          Descrizione
        </h2>
        {spell.descrizione ? (
          <HtmlText html={spell.descrizione} damageIcons references={spell.edizione === "2014" ? undefined : inlineConditionReferences} spellReferences={spell.edizione === "2014" ? undefined : inlineSpellReferences(spell.descrizione)} />
        ) : (
          <p className="font-serif text-[15px] italic leading-6 text-muted">
            Descrizione non disponibile per questo incantesimo.
          </p>
        )}
      </section>
      {original?.statBlockSummary && (
        <section className="px-6 pb-6">
          <h2 className="mb-3 font-serif text-lg font-semibold text-primary">Spirito richiamato — riepilogo</h2>
          <HtmlText html={original.statBlockSummary} damageIcons references={inlineConditionReferences} spellReferences={inlineSpellReferences(original.statBlockSummary)} />
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

    </article>
  );
}
