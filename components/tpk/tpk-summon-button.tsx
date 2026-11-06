"use client";

import { tpkSummonUrl } from "@/lib/tpk";

/**
 * «⚔ Affrontalo in Total Party Kill» (PROMPT 69): a plain link to TPK in a new tab, nothing loaded from there (no
 * prefetch, no request of the Grimorio). The tap is counted like the other events (components/analytics-provider.tsx),
 * only when the statistics are on for this visitor; the creature is the one of the page (/mostro/<id>).
 */
export function TpkSummonButton({ id }: { id: string }) {
  return (
    <a
      href={tpkSummonUrl(id)}
      target="_blank"
      rel="noopener"
      data-tpk-summon={id}
      onClick={() => window.dispatchEvent(new CustomEvent("grimorio:analytics-event", { detail: { event: "tpk_summon_click", id } }))}
      className="pg-angoli flex min-h-16 items-center gap-3 rounded-2xl border-[1.5px] border-primary bg-card px-4 py-3 text-left no-underline active:bg-[#F1E7D0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-[22px] leading-none text-card">⚔</span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold leading-snug text-primary">Affrontalo in Total Party Kill</span>
        <span className="block text-[14px] leading-snug text-muted">Scegli il tuo party e combatti · si apre in una nuova scheda</span>
      </span>
      <span aria-hidden="true" className="shrink-0 text-[28px] leading-none text-primary">›</span>
    </a>
  );
}
