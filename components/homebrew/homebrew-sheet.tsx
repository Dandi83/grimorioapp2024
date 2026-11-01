import type { ReactNode } from "react";

import { MonsterSheetBody, MonsterSheetTitle } from "@/components/monster-sheet";
import { BothEditionsBadge, MonsterProvenanceBadge } from "@/components/monster-provenance-badge";
import { HOMEBREW_LICENSE_URL, authorLine } from "@/lib/homebrew-types";
import type { Monster } from "@/lib/monsters-types";
import type { CardDisplayContext } from "@/lib/card-display";
import { HomebrewPill, VerifiedPill } from "@/components/homebrew-pill";

/**
 * The label of a sheet of «I mostri creati da voi»: the pill («Dalla community» or «Dalla redazione»), then the edition:
 * one dark label, «📖 2014 e 2024» for a creature of both editions (PROMPT 28), the year otherwise.
 */
export function HomebrewLabel({ edizione, ours = false, verified = false }: { edizione: "2014" | "2024" | "entrambe"; ours?: boolean; verified?: boolean }) {
  return (
    <span className="flex flex-wrap items-center justify-end gap-1.5">
      <HomebrewPill ours={ours} />
      {verified && <VerifiedPill />}
      {edizione === "entrambe" ? <BothEditionsBadge /> : <MonsterProvenanceBadge edition={edizione} variant="dark" />}
    </span>
  );
}

/**
 * Under the title: «Proposta da <nickname>» in bold, then in small print the licence and «controllata dal Grimorio»;
 * ours: «Mostro originale, bilanciato sui mostri ufficiali dello stesso GS» (the pill already says «Dalla redazione»),
 * only while «✓ Bilanciamento verificato» is off: with it, the line would say the same thing twice (PROMPT 28).
 */
export function HomebrewByline({ autore, licenza, verified = false }: { autore: string | null | undefined; licenza: string | null | undefined; verified?: boolean }) {
  if (!autore) {
    if (verified) return null;
    return <span className="block text-[13px] leading-5" data-homebrew-byline="grimorio">Mostro originale, bilanciato sui mostri ufficiali dello stesso GS</span>;
  }
  return (
    <>
      <span className="block font-bold" data-homebrew-byline="community">{authorLine(autore, "card")}</span>
      <span className="block text-[13px] leading-5" data-homebrew-license="">
        {licenza && <>Licenza{" "}<a href={HOMEBREW_LICENSE_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{licenza}</a>{" · "}</>}
        controllata dal Grimorio
      </span>
    </>
  );
}

/** The closing note of an original sheet, in place of the SRD source: the community's, or the editorial staff's (PROMPT 25). */
export function HomebrewNote({ ours = false }: { ours?: boolean }) {
  return (
    <aside aria-label="Fonte della scheda" data-source-box="" data-original-note={ours ? "redazione" : "community"} className="mx-6 mb-8 rounded-xl border border-border bg-card p-4 text-sm leading-6 text-muted">
      <p>{ours
        ? "Creatura originale della redazione del Grimorio, non ufficiale. Non fa parte dell’SRD e non è materiale Wizards of the Coast."
        : "Creatura di «I mostri creati da voi», non ufficiale. Non fa parte dell’SRD e non è materiale Wizards of the Coast."}</p>
    </aside>
  );
}

/** «Anteprima» of /admin/proposte: the sheet as the public will see it (same component, same order, same links). */
export function HomebrewSheet({ monster, before, context = {}, hiddenSections }: { monster: Monster; before?: ReactNode; context?: CardDisplayContext; hiddenSections?: readonly string[] }) {
  const edizione = monster.homebrew_edizione ?? "2024";
  return (
    <article className="monster-sheet relative pb-2 pt-4">
      <MonsterSheetTitle monster={monster} before={before} label={<HomebrewLabel edizione={edizione} ours={!monster.homebrew_autore} verified={!!monster.homebrew_verificato} />} byline={<HomebrewByline autore={monster.homebrew_autore} licenza={monster.homebrew_licenza} verified={!!monster.homebrew_verificato} />} labelBelow />
      <MonsterSheetBody monster={{ ...monster, fonte_scheda: "Homebrew" }} legacy={edizione === "2014"} catalog={context.catalog} hidden={context.hidden} descriptionFirst hiddenSections={hiddenSections} />
      <HomebrewNote ours={!monster.homebrew_autore} />
    </article>
  );
}
