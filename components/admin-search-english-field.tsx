"use client";

import { useEffect, useState } from "react";
import { readSearchEnglishAction, type SearchEnglishFieldData } from "@/app/actions/admin-search-english";
import { RulesEditionBadge } from "@/components/rules-edition-badge";
import type { SearchEnglishKind } from "@/lib/search-english";

/**
 * «Nome inglese (solo ricerca)» in the editor of a NO SRD card (PROMPT 37): the official English name, saved with the
 * card, shown in the search results as «in inglese: …» (PROMPT 38). The value is read when the editor opens; until
 * then the field is not sent, so a quick save changes nothing. The preview: the card as «Nomi inglesi da verificare»
 * lists it (edition, «Invocazione · liv. 3»), with the line of the results. Protected proper names and trademarks are
 * refused by the save (lib/search-english.ts).
 */
export function AdminSearchEnglishField({ kind, id }: { kind: SearchEnglishKind; id?: string }) {
  const [value, setValue] = useState<string | null>(id ? null : "");
  const [card, setCard] = useState<SearchEnglishFieldData["card"]>();
  useEffect(() => {
    if (!id) return;
    let alive = true;
    readSearchEnglishAction(kind, id).then(data => { if (alive) { setValue(data.name); setCard(data.card); } }, () => { if (alive) setValue(null); });
    return () => { alive = false; };
  }, [kind, id]);
  const shown = value?.trim().replace(/\s+/g, " ");
  return (
    <div className="rounded-lg border border-border px-3 py-2.5" data-search-english-field="">
      {value !== null && <input type="hidden" name="inglese-campo" value="1" />}
      <label htmlFor="nome_inglese_ricerca" className="mb-1.5 block text-sm text-muted-foreground">Nome inglese (solo ricerca)</label>
      <input id="nome_inglese_ricerca" name="nome_inglese_ricerca" lang="en" maxLength={80} disabled={value === null}
        value={value ?? ""} onChange={event => setValue(event.target.value)} placeholder={value === null ? "Caricamento…" : "es. Synaptic Static"}
        autoComplete="off" spellCheck={false}
        className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-[15px] text-foreground" />
      <p className="mt-1 text-xs leading-5 text-muted-foreground">Compare nei risultati di ricerca come «in inglese: …».</p>
      {card && (
        <div data-search-english-preview="" className="mt-2 rounded-lg bg-muted/40 px-3 py-2 text-[14px] leading-5">
          <span className="flex flex-wrap items-center gap-x-2">
            <b className="font-serif text-[16px]">{card.nome}</b>
            <span data-search-english-edition=""><RulesEditionBadge edition={card.edizione} variant="dark" /></span>
          </span>
          {card.etichetta && <span data-search-english-label="" className="block text-muted-foreground">{card.etichetta}</span>}
          {shown && <span className="block text-[13px] text-muted-foreground">in inglese: <span lang="en">{shown}</span></span>}
        </div>
      )}
    </div>
  );
}
