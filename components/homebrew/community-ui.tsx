import Link from "next/link";
import { PenLine } from "lucide-react";

import { BackButton } from "@/components/back-button";

import { HiddenTag } from "@/components/sections/hidden-tag";
import { SoonTag } from "@/components/sections/soon-tag";
import { BetaPill } from "./beta-pill";

/** Where the form and the sections are (the internal addresses keep «homebrew» elsewhere). */
export const COMMUNITY_HREF = "/bestiario/creati-da-voi";
export const PROPOSE_HREF = "/bestiario/proponi";
/** PROMPT 25: the original creatures of the editorial staff, and the two groups together. */
export const GRIMORIO_HREF = "/bestiario/del-grimorio";
export const ORIGINALS_HREF = "/bestiario/creature-originali";

type PartView = { shown: boolean; hidden: boolean; soon: boolean };
const plural = (count: number) => (count === 1 ? "1 creatura" : `${count} creature`);

/**
 * «Creature originali» above the list of the Bestiario (PROMPT 25, in place of the dark card of PROMPT 13), under the
 * search and the filters, in the flow of the page: the row «Creature originali · Beta · Vedi tutte · N ›» while at least
 * one group is shown, and two tiles side by side (also at 390 px): «Dalla redazione» (light, bordeaux border) and
 * «Dalla community» (dark, gold), each with the creatures of the chosen edition. A group «In arrivo»: its tile dimmed,
 * with the pill, no count, to the «in arrivo» page (the community keeps «Proponi il tuo»); hidden: no tile (the
 * administrator sees it, labelled). compact: the list column of the computer.
 */
export function OriginalsBlock({ counts, parts, compact = false }: {
  counts: { grimorio: number; community: number }; parts: { grimorio: PartView; community: PartView }; compact?: boolean;
}) {
  const shown = (part: PartView) => part.shown;
  const present = (part: PartView) => part.shown || part.soon;
  if (!present(parts.grimorio) && !present(parts.community)) return null;
  const total = (shown(parts.grimorio) ? counts.grimorio : 0) + (shown(parts.community) ? counts.community : 0);
  const tiles = [present(parts.grimorio) && "grimorio", present(parts.community) && "community"].filter(Boolean) as ("grimorio" | "community")[];
  return (
    <section aria-labelledby={compact ? "originals-compact-title" : "originals-title"} data-originals-block="" data-compact={compact ? "" : undefined} className={compact ? "mt-3" : "mt-4"}>
      {(shown(parts.grimorio) || shown(parts.community)) && (
        <div className="relative flex items-center gap-2" data-originals-row="">
          <h2 id={compact ? "originals-compact-title" : "originals-title"} className={`min-w-0 font-serif font-bold leading-tight text-foreground ${compact ? "text-[18px]" : "text-[21px]"}`}>
            Creature originali <BetaPill row />
          </h2>
          <Link href={ORIGINALS_HREF} data-originals-all={total} className="ml-auto inline-flex min-h-11 shrink-0 items-center whitespace-nowrap text-[15px] font-bold text-primary">
            Vedi tutte · {total} ›
          </Link>
        </div>
      )}
      <div className={`mt-1 grid gap-2 ${tiles.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
        {tiles.map(group => group === "grimorio"
          ? <OriginalsTile key={group} group={group} part={parts.grimorio} count={counts.grimorio} compact={compact} />
          : <OriginalsTile key={group} group={group} part={parts.community} count={counts.community} compact={compact} />)}
      </div>
    </section>
  );
}

const TILE = {
  grimorio: { kicker: "Dalla redazione", title: "Mostri del Grimorio", href: GRIMORIO_HREF, part: "bestiario:grimorio",
    style: "border-[1.5px] border-[#7A1F2B] bg-[#FFFBF0] text-[#2B2118]", kickerStyle: "text-[#7A1F2B]", countStyle: "text-[#7A1F2B]" },
  community: { kicker: "Dalla community", title: "Creati da voi", href: COMMUNITY_HREF, part: "bestiario:homebrew",
    style: "bg-[#2B2118] text-[#FFFBF0]", kickerStyle: "text-[#E0A21A]", countStyle: "text-[#E0A21A]" },
} as const;

function OriginalsTile({ group, part, count, compact }: { group: "grimorio" | "community"; part: PartView; count: number; compact: boolean }) {
  const tile = TILE[group];
  const soon = !part.shown && part.soon;
  const href = soon ? `/in-arrivo/${encodeURIComponent(tile.part)}` : tile.href;
  return (
    <div className={`flex min-w-0 flex-col rounded-[14px] ${tile.style} ${compact ? "p-2.5" : "p-3"}`} data-originals-tile={group} data-part={tile.part} data-tile-state={soon ? "in-arrivo" : part.hidden ? "nascosta" : "visibile"}>
      <Link href={href} prefetch={false} className={`flex min-w-0 flex-1 flex-col ${soon ? "opacity-60" : ""}`} data-originals-link={group}>
        <span className={`text-[11px] font-bold uppercase tracking-[0.1em] ${tile.kickerStyle}`}>{tile.kicker}</span>
        <span className={`mt-0.5 font-serif font-bold leading-tight ${compact ? "text-[16px]" : "text-[18px]"}`}>{tile.title}</span>
        {part.hidden && part.shown && <span className="mt-1">{part.soon ? <SoonTag /> : <HiddenTag />}</span>}
        {soon
          ? <span className="mt-1.5"><SoonTag /></span>
          : <span className={`mt-1.5 text-[14px] font-bold ${tile.countStyle}`} data-originals-count={count}>{plural(count)} ›</span>}
      </Link>
      {group === "community" && (
        <Link href={PROPOSE_HREF} data-community-propose="" className={`mt-2 flex items-center justify-center gap-1.5 rounded-[10px] bg-[#E0A21A] px-2 font-bold text-[#2B2118] ${compact ? "min-h-10 text-[13px]" : "min-h-11 text-[14px]"}`}>
          <PenLine size={15} aria-hidden="true" /><span className="whitespace-nowrap">Proponi il tuo</span>
        </Link>
      )}
    </div>
  );
}

const STEPS = [
  ["Compila la scheda", "con i menu a tendina e l’anteprima dal vivo."],
  ["La controlliamo", "bilanciamento, testi e regole: se serve ti scriviamo."],
  ["La pubblichiamo", "qui, con il tuo nome. Tutti la possono usare al tavolo."],
] as const;

/** The top of /bestiario/creati-da-voi (screen ②): back (where the visitor came from, else the Bestiario), the title, the text, the button, the three steps. */
export function CommunityHeader({ children }: { children?: React.ReactNode }) {
  return (
    <div data-community-header="">
      <BackButton fallback="/bestiario" label="Bestiario" />
      <div className="mt-1 flex items-start justify-between gap-3">
        <h1 className="min-w-0 font-serif text-[36px] font-bold leading-tight text-foreground">I mostri creati da voi <BetaPill /></h1>
        {children}
      </div>
      <p className="mt-2 text-[15px] leading-6 text-muted">
        Creature inventate dai master della community del Grimorio. Non fanno parte dei manuali: le controlliamo una per una prima di pubblicarle.
      </p>
      <Link href={PROPOSE_HREF} data-community-propose="" className="mt-4 flex min-h-[54px] items-center justify-center gap-2 rounded-[10px] bg-[#7A1F2B] px-4 text-[17px] font-bold text-[#FFFBF0]">
        <PenLine size={19} aria-hidden="true" />Proponi un mostro
      </Link>
      <ol className="mt-4 space-y-3 rounded-[14px] border border-[#DDCFAE] bg-[#FFFBF0] p-4" data-community-steps="">
        {STEPS.map(([title, text], index) => (
          <li key={title} className="flex gap-3">
            <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-[#7A1F2B] font-serif text-[16px] font-bold text-[#FFFBF0]">{index + 1}</span>
            <p className="text-[15px] leading-6 text-foreground"><b>{title}</b> {text}</p>
          </li>
        ))}
      </ol>
      {/* PROMPT 19: how the creatures are checked, the public page of the method. */}
      <Link href="/bestiario/creati-da-voi/bilanciamento" data-method-link="header" className="mt-1 inline-flex min-h-11 items-center text-[14px] font-semibold text-[#7A1F2B] underline-offset-4 hover:underline">
        Come valutiamo il bilanciamento ›
      </Link>
    </div>
  );
}

/** The top of /bestiario/del-grimorio (PROMPT 25): back, the title, a short line and the method; no «Proponi». */
export function GrimorioHeader({ children }: { children?: React.ReactNode }) {
  return (
    <div data-grimorio-header="">
      <BackButton fallback="/bestiario" label="Bestiario" />
      <div className="mt-1 flex items-start justify-between gap-3">
        <h1 className="min-w-0 font-serif text-[36px] font-bold leading-tight text-foreground">Mostri del Grimorio</h1>
        {children}
      </div>
      <p className="mt-2 text-[15px] leading-6 text-muted">
        Creature originali della redazione, bilanciate con il nostro simulatore.{" "}
        <Link href="/bestiario/creati-da-voi/bilanciamento" data-method-link="grimorio" className="font-semibold text-[#7A1F2B] underline-offset-4 hover:underline">Come valutiamo il bilanciamento ›</Link>
      </p>
    </div>
  );
}

/** The top of /bestiario/creature-originali (PROMPT 25): back, «Creature originali» with «Beta». */
export function OriginalsHeader({ children }: { children?: React.ReactNode }) {
  return (
    <div data-originals-header="">
      <BackButton fallback="/bestiario" label="Bestiario" />
      <div className="mt-1 flex items-start justify-between gap-3">
        <h1 className="min-w-0 font-serif text-[36px] font-bold leading-tight text-foreground">Creature originali <BetaPill /></h1>
        {children}
      </div>
      <p className="mt-2 text-[15px] leading-6 text-muted">Le creature della redazione e quelle della community, tutte insieme. Non fanno parte dei manuali.</p>
    </div>
  );
}

/** At the end of «Creature originali» and of an empty community: the form. */
export function ProposeButton() {
  return (
    <Link href={PROPOSE_HREF} data-community-propose="" className="flex min-h-[54px] items-center justify-center gap-2 rounded-[10px] bg-[#E0A21A] px-4 text-[17px] font-bold text-[#2B2118]">
      <PenLine size={19} aria-hidden="true" />Proponi il tuo
    </Link>
  );
}
