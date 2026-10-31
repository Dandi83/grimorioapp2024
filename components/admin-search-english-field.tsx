"use client";

import { useEffect, useState } from "react";
import { readSearchEnglishAction } from "@/app/actions/admin-search-english";
import type { SearchEnglishKind } from "@/lib/search-english";

/**
 * «Nome inglese (solo ricerca)» in the editor of a NO SRD card (PROMPT 37): the official English name, saved with the
 * card. The value is read when the editor opens; until then the field is not sent, so a quick save changes nothing.
 * Protected proper names and trademarks are refused by the save (lib/search-english.ts).
 */
export function AdminSearchEnglishField({ kind, id }: { kind: SearchEnglishKind; id?: string }) {
  const [value, setValue] = useState<string | null>(id ? null : "");
  useEffect(() => {
    if (!id) return;
    let alive = true;
    readSearchEnglishAction(kind, id).then(name => { if (alive) setValue(name); }, () => { if (alive) setValue(null); });
    return () => { alive = false; };
  }, [kind, id]);
  return (
    <div className="rounded-lg border border-border px-3 py-2.5" data-search-english-field="">
      {value !== null && <input type="hidden" name="inglese-campo" value="1" />}
      <label htmlFor="nome_inglese_ricerca" className="mb-1.5 block text-sm text-muted-foreground">Nome inglese (solo ricerca)</label>
      <input id="nome_inglese_ricerca" name="nome_inglese_ricerca" lang="en" maxLength={80} disabled={value === null}
        value={value ?? ""} onChange={event => setValue(event.target.value)} placeholder={value === null ? "Caricamento…" : "es. Synaptic Static"}
        autoComplete="off" spellCheck={false}
        className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-[15px] text-foreground" />
      <p className="mt-1 text-xs leading-5 text-muted-foreground">Serve solo a trovarla cercando in inglese: non compare mai nell’app.</p>
    </div>
  );
}
