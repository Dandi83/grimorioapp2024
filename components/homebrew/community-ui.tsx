import Link from "next/link";
import { ChevronLeft, PenLine } from "lucide-react";

import { HiddenTag } from "@/components/sections/hidden-tag";
import { BetaPill } from "./beta-pill";

/** Where the form and the section are (the internal addresses keep «homebrew» elsewhere). */
export const COMMUNITY_HREF = "/bestiario/creati-da-voi";
export const PROPOSE_HREF = "/bestiario/proponi";

/**
 * The card of the Bestiario (screen ① of «I mostri creati da voi», PROMPT 13): dark, under the search and the active
 * filters. count: the creatures published in the chosen edition; none yet, only «Proponi il tuo». hidden: the
 * administrator sees it while the visitors do not (the switch of lib/community.ts or /admin/sezioni).
 * compact: the list column of the computer (PROMPT 17), above «N risultati»: smaller, no large pen, the two buttons on
 * one row and, with none yet, the sentence on one line.
 */
export function CommunityInvite({ count, hidden = false, compact = false }: { count: number; hidden?: boolean; compact?: boolean }) {
  const text = count > 0
    ? "Creature inventate dai master del Grimorio, controllate da noi prima di pubblicarle."
    : "Sii il primo a proporre una creatura: la controlliamo e la pubblichiamo con il tuo nome.";
  // Compact: no overflow-hidden (the note of «Beta» goes past the bottom of the small card).
  return (
    <section aria-labelledby={compact ? "community-invite-compact-title" : "community-invite-title"} data-community-invite={count} data-compact={compact ? "" : undefined}
      className={`relative rounded-[16px] bg-[#2B2118] text-[#FFFBF0] ${compact ? "mt-3 p-3" : "mt-4 overflow-hidden p-4"}`}>
      {!compact && <PenLine aria-hidden="true" size={120} strokeWidth={1.2} className="pointer-events-none absolute -right-5 -top-5 text-[#E0A21A] opacity-15" />}
      {hidden && <HiddenTag className="relative mb-2 !bg-[#FFFBF0] !text-[#2B2118]" />}
      <p className="relative text-[12px] font-bold uppercase tracking-[0.12em] text-[#E0A21A]">Dalla community</p>
      <h2 id={compact ? "community-invite-compact-title" : "community-invite-title"}
        className={`relative mt-1 font-serif font-bold leading-tight ${compact ? "text-[20px]" : "text-[26px]"}`}>I mostri creati da voi <BetaPill tone="dark" narrow={compact} /></h2>
      {compact
        ? count === 0 && <p className="relative mt-1 truncate text-[14px] leading-5 text-[#F1E6CC]" title={text} data-community-text="">{text}</p>
        : <p className="relative mt-1 text-[15px] leading-6 text-[#F1E6CC]">{text}</p>}
      {/* Compact: «Sfoglia» as wide as its text, «Proponi il tuo» the rest, both on one line in the 320 px column. */}
      <div className={`relative gap-2 ${compact ? "mt-2.5 flex [&>a]:whitespace-nowrap [&>a:last-child]:flex-1" : `mt-3 grid ${count > 0 ? "grid-cols-2" : "grid-cols-1"}`}`}>
        {count > 0 && (
          <Link href={COMMUNITY_HREF} data-community-browse="" className={`flex ${compact ? "min-h-11 text-[14px]" : "min-h-[46px] text-[15px]"} items-center justify-center rounded-[10px] bg-[#FFFBF0] px-3 font-bold text-[#2B2118]`}>
            Sfoglia · {count}
          </Link>
        )}
        <Link href={PROPOSE_HREF} data-community-propose="" className={`flex ${compact ? "min-h-11 text-[14px]" : "min-h-[46px] text-[15px]"} items-center justify-center gap-2 rounded-[10px] bg-[#E0A21A] px-3 font-bold text-[#2B2118]`}>
          <PenLine size={compact ? 16 : 17} aria-hidden="true" />Proponi il tuo
        </Link>
      </div>
    </section>
  );
}

const STEPS = [
  ["Compila la scheda", "con i menu a tendina e l’anteprima dal vivo."],
  ["La controlliamo", "bilanciamento, testi e regole: se serve ti scriviamo."],
  ["La pubblichiamo", "qui, con il tuo nome. Tutti la possono usare al tavolo."],
] as const;

/** The top of /bestiario/creati-da-voi (screen ②): back to the Bestiario, the title, the text, the button, the three steps. */
export function CommunityHeader({ children }: { children?: React.ReactNode }) {
  return (
    <div data-community-header="">
      <Link href="/bestiario" className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-base font-bold text-primary">
        <ChevronLeft size={22} aria-hidden="true" />Bestiario
      </Link>
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
