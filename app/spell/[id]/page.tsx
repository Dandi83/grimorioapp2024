import Image from "next/image";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { FavoriteButton } from "@/components/favorite-button";
import { HtmlText } from "@/components/html-text";
import { capitalizeWords, getSpellById, SPELLS } from "@/lib/spells";
import { schoolColor } from "@/lib/school-colors";

export function generateStaticParams() {
  return SPELLS.map((s) => ({ id: s.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const spell = getSpellById(id);
  if (!spell) return { title: "Incantesimo non trovato" };
  const titolo = capitalizeWords(spell.nome_italiano);
  return {
    title: `${titolo} — GrimorioApp`,
    description:
      spell.descrizione?.replace(/<[^>]+>/g, "").slice(0, 160) ||
      `${titolo}, incantesimo di ${spell.scuola}.`,
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
  const spell = getSpellById(id);
  if (!spell) notFound();

  const color = schoolColor(spell.scuola);
  const titolo = capitalizeWords(spell.nome_italiano);
  const badge =
    spell.livello_num === 0
      ? `Trucchetto · ${spell.scuola}`
      : `${spell.livello_num}° Livello · ${spell.scuola}`;

  return (
    <article>
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
          </h1>
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
          <HtmlText html={spell.descrizione} />
        ) : (
          <p className="font-serif text-[15px] italic leading-6 text-muted">
            Descrizione non disponibile per questo incantesimo.
          </p>
        )}
      </section>

      <FavoriteButton id={spell.id} />
    </article>
  );
}
