import Image from "next/image";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { FavoriteButton } from "@/components/favorite-button";
import { HtmlText } from "@/components/html-text";
import { getMonsterById } from "@/lib/monsters";
import { abilityMod, monsterColor, gsLabel } from "@/lib/monsters-types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const monster = await getMonsterById(id);
  if (!monster) return { title: "Mostro non trovato" };
  return {
    title: `${monster.nome} — Bestiario GrimorioApp`,
    description:
      monster.descrizione?.replace(/<[^>]+>/g, "").slice(0, 160) ||
      `${monster.nome}, ${monster.tipo}.`,
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

function AbilityCell({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-border bg-card py-3">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
        {label}
      </span>
      <span className="font-serif text-xl font-bold leading-6 text-foreground">
        {score}
      </span>
      <span className="text-xs font-semibold text-primary">
        {abilityMod(score)}
      </span>
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <p className="text-[15px] leading-6 text-foreground">
      <span className="font-bold text-primary">{label}</span> {value}
    </p>
  );
}

function Section({ title, html }: { title: string; html: string }) {
  if (!html) return null;
  return (
    <section className="px-6 pb-4">
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-primary">
        {title}
      </h2>
      <HtmlText html={html} />
    </section>
  );
}

export default async function MonsterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const monster = await getMonsterById(id);
  if (!monster) notFound();

  const color = monsterColor(monster.tipo);
  const sottotitolo = [monster.taglia, monster.tipo, monster.allineamento]
    .filter(Boolean)
    .join(" · ");

  return (
    <article>
      {/* Hero */}
      <header className="relative h-[320px] overflow-hidden">
        <Image
          src="/hero-bestiario.png"
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
        <FavoriteButton id={`mostro:${monster.id}`} />
        <div className="absolute inset-x-0 bottom-0 p-6">
          <span
            className="mb-3 inline-flex items-center gap-2 rounded-full border bg-elevated/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground"
            style={{ borderColor: color }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            {gsLabel(monster.grado_sfida)}
            {monster.px ? ` · ${monster.px}` : ""}
          </span>
          <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-foreground text-balance">
            {monster.nome}
          </h1>
          {sottotitolo && (
            <p className="mt-1 text-sm italic text-muted">{sottotitolo}</p>
          )}
        </div>
      </header>

      {/* Statistiche base */}
      <div className="flex flex-wrap gap-3 p-6">
        <MetaCell label="Classe Armatura" value={monster.classe_armatura} />
        <MetaCell label="Punti Ferita" value={monster.punti_ferita} />
        <MetaCell label="Velocità" value={monster.velocita} />
        <MetaCell label="Grado Sfida" value={monster.grado_sfida} />
      </div>

      {/* Caratteristiche */}
      <section className="px-6 pb-4">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-primary">
          Caratteristiche
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <AbilityCell label="FOR" score={monster.forza} />
          <AbilityCell label="DES" score={monster.destrezza} />
          <AbilityCell label="COS" score={monster.costituzione} />
          <AbilityCell label="INT" score={monster.intelligenza} />
          <AbilityCell label="SAG" score={monster.saggezza} />
          <AbilityCell label="CAR" score={monster.carisma} />
        </div>
      </section>

      {/* Dettagli secondari */}
      {(monster.tiri_salvezza ||
        monster.abilita ||
        monster.vulnerabilita ||
        monster.resistenze ||
        monster.immunita_danni ||
        monster.immunita_condizioni ||
        monster.sensi ||
        monster.linguaggi) && (
        <section className="mx-6 mb-4 space-y-1 rounded-xl border border-border bg-card p-4">
          <StatLine label="Tiri Salvezza" value={monster.tiri_salvezza} />
          <StatLine label="Abilità" value={monster.abilita} />
          <StatLine label="Vulnerabilità" value={monster.vulnerabilita} />
          <StatLine label="Resistenze" value={monster.resistenze} />
          <StatLine label="Immunità ai Danni" value={monster.immunita_danni} />
          <StatLine
            label="Immunità alle Condizioni"
            value={monster.immunita_condizioni}
          />
          <StatLine label="Sensi" value={monster.sensi} />
          <StatLine label="Linguaggi" value={monster.linguaggi} />
        </section>
      )}

      <Section title="Tratti" html={monster.tratti} />
      <Section title="Azioni" html={monster.azioni} />
      <Section title="Reazioni" html={monster.reazioni} />
      <Section title="Azioni Leggendarie" html={monster.azioni_leggendarie} />
      <Section title="Descrizione" html={monster.descrizione} />
    </article>
  );
}
