"use client";

import { useActionState } from "react";
import { approveSearchEnglishAction, discardSearchEnglishAction } from "@/app/actions/admin-search-english";
import type { SearchEnglishKind } from "@/lib/search-english";
import { RulesEditionBadge } from "@/components/rules-edition-badge";

/**
 * One card of «Nomi inglesi da verificare»: the Italian name with its edition pill and what the lists say of it
 * («Invocazione · liv. 3», «Aberrazione · GS 14»), the English name proposed or approved, Approva / Modifica / Scarta.
 */
export function SearchEnglishRow({ kind, id, nome, inglese, approved, href, edizione, etichetta }: { kind: SearchEnglishKind; id: string; nome: string; inglese: string; approved: boolean; href: string; edizione: "2014" | "2024"; etichetta: string }) {
  const [approval, approve, approving] = useActionState(approveSearchEnglishAction, null);
  const [, discard, discarding] = useActionState(discardSearchEnglishAction, null);
  const busy = approving || discarding;
  return (
    <li data-search-english={`${kind}:${id}`} className="px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="flex flex-wrap items-center gap-x-2">
          <a href={href} className="font-serif text-[19px] font-bold leading-tight text-[#2B2118] underline-offset-4 hover:underline">{nome}</a>
          <span data-search-english-edition=""><RulesEditionBadge edition={edizione} variant="dark" /></span>
        </span>
        <span className="text-[13px] font-semibold text-[#5E4E3E]">{kind === "incantesimo" ? "Incantesimo" : "Mostro"}{approved ? " · approvato" : " · da verificare"}</span>
      </div>
      {etichetta && <p data-search-english-label="" className="text-[14px] text-[#5E4E3E]">{etichetta}</p>}
      <p className="mt-0.5 text-[15px]">
        <span className="text-[#5E4E3E]">{approved ? "Nome inglese: " : "Proposta: "}</span>
        <b lang="en" data-search-english-name="">{inglese}</b>
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
        {!approved && (
          <form action={approve}>
            <input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={id} /><input type="hidden" name="nome" value={inglese} />
            <button type="submit" disabled={busy} className="min-h-11 rounded-full bg-[#7A1F2B] px-4 text-[14px] font-bold text-[#FFFBF0]">Approva</button>
          </form>
        )}
        <details className="w-full sm:w-auto">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-[14px] font-bold text-[#7A1F2B]">Modifica</summary>
          <form action={approve} className="flex flex-wrap items-center gap-2 pb-1">
            <input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={id} />
            <label className="min-w-0 flex-1 text-[13px] text-[#5E4E3E]">
              <span className="sr-only">Nome inglese di {nome}</span>
              <input name="nome" defaultValue={inglese} lang="en" maxLength={80} required className="min-h-11 w-full rounded-lg border border-[#DDCFAE] bg-white px-3 text-[15px] text-[#2B2118]" />
            </label>
            <button type="submit" disabled={busy} className="min-h-11 rounded-full bg-[#7A1F2B] px-4 text-[14px] font-bold text-[#FFFBF0]">Salva e approva</button>
          </form>
        </details>
        <form action={discard}>
          <input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={id} />
          <button type="submit" disabled={busy} className="min-h-11 text-[14px] font-bold text-[#7A4E00]">Scarta</button>
        </form>
      </div>
      {approval?.error && <p role="alert" data-search-english-error="" className="mt-1 text-[14px] font-semibold text-[#8E1B1B]">{approval.error}</p>}
    </li>
  );
}
