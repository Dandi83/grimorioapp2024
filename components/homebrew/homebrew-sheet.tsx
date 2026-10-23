import type { ReactNode } from "react";

import { MonsterSheetBody, MonsterSheetTitle } from "@/components/monster-sheet";
import { MonsterProvenanceBadge } from "@/components/monster-provenance-badge";
import { authorLine } from "@/lib/homebrew-types";
import type { Monster } from "@/lib/monsters-types";
import { BothEditionsPill, HomebrewPill } from "@/components/homebrew-pill";

/** The label of a homebrew sheet: the amber pill, then the edition (or «2014 e 2024»). */
export function HomebrewLabel({ edizione }: { edizione: "2014" | "2024" | "entrambe" }) {
  return (
    <span className="flex flex-wrap items-center justify-end gap-1.5">
      <HomebrewPill />
      {edizione === "entrambe" ? <BothEditionsPill /> : <MonsterProvenanceBadge edition={edizione} variant="dark" />}
    </span>
  );
}

/** The closing note of a homebrew sheet, in place of the SRD source. */
export function HomebrewNote() {
  return (
    <aside aria-label="Fonte della scheda" className="mx-6 mb-8 rounded-xl border border-border bg-card p-4 text-sm leading-6 text-muted">
      <p>Creatura homebrew, non ufficiale. Non fa parte dell’SRD e non è materiale Wizards of the Coast.</p>
    </aside>
  );
}

/** «Anteprima» of /admin/proposte: the sheet as the public will see it (same component, same order). */
export function HomebrewSheet({ monster, before }: { monster: Monster; before?: ReactNode }) {
  const edizione = monster.homebrew_edizione ?? "2024";
  return (
    <article className="monster-sheet relative pb-2 pt-4">
      <MonsterSheetTitle monster={monster} before={before} label={<HomebrewLabel edizione={edizione} />} byline={authorLine(monster.homebrew_autore, "card")} />
      <MonsterSheetBody monster={monster} legacy={edizione === "2014"} />
      <HomebrewNote />
    </article>
  );
}
