"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { HomebrewPill } from "@/components/homebrew-pill";
import { ChevronRight, Search } from "lucide-react";

import { useUserEdition } from "@/components/edition/edition-provider";
import { GRIMORIO_LABEL, HOMEBREW_LABEL, rowHref, rowsOf, search, splitByEdition, suggestionOf, type SearchGroup, type SearchIndex, type SearchMatch, type SearchSectionKey } from "@/lib/search";
import { otherEdition } from "@/lib/user-edition";
import { useReportSearch } from "@/components/statistics/use-report-search";
import { DidYouMean, SimilarResultsHeading, usePreparedNames, useSettledQuery } from "@/components/search/did-you-mean";
import { SEARCH_INPUT } from "@/lib/search-input";
import { InEnglish } from "@/components/search/in-english";
import { Marked } from "@/components/search/marked";
import { englishOf } from "@/lib/english-match";
import { matchName } from "@/lib/fuzzy-search";
import { typedLength } from "@/lib/highlight";

export interface SearchPanelProps {
  initialQuery: string;
  initialSection?: string;
  onClose: () => void;
}

/** Examples under «Prova a scrivere…»: each one finds results in the data (tests/search.cjs). */
const EXAMPLES = ["drago", "fuoco", "spada", "avvelenato", "anello"];

let indexPromise: Promise<SearchIndex> | undefined;
// Fetched once, at the first opening; the service worker keeps a copy for offline use.
const loadIndex = () => (indexPromise ??= fetch("/ricerca-indice.json").then(response => {
  if (!response.ok) throw new Error(String(response.status));
  return response.json() as Promise<SearchIndex>;
}).catch(error => { indexPromise = undefined; throw error; }));

/** The Italian name with the letters found marked; a result found by a synonym or an English name marks its Italian name only when the query finds it too. */
function Highlighted({ row, query, settled }: { row: SearchMatch; query: string; settled: boolean }) {
  const match = row.alias ? matchName(row.nome, query, { wordStart: true, settled }) : row;
  // Singular and plural: the word of the name, not the length of the typed one.
  return match ? <Marked text={row.nome} start={match.start} length={match.length ?? typedLength(query)} /> : <>{row.nome}</>;
}

/** Results of one list, grouped by section, each group with «Mostra tutti». */
function Groups({ groups, query, settled, edition, prefix, onExpand }: {
  groups: SearchGroup[];
  query: string;
  settled: boolean;
  edition: string;
  prefix: string;
  onExpand: (section: SearchSectionKey) => void;
}) {
  return groups.map(group => (
    <section key={group.section} aria-labelledby={`${prefix}-${group.section}`} className="pt-3.5">
      <div className="flex items-baseline justify-between px-0.5 pb-1.5">
        <h2 id={`${prefix}-${group.section}`} className="font-serif text-[21px] font-bold text-primary">{group.title}</h2>
        <span className="text-[14px] text-muted">{group.total} {group.total === 1 ? "risultato" : "risultati"}</span>
      </div>
      <ul className="overflow-hidden rounded-[14px] border-[1.5px] border-border bg-card">
        {group.rows.map(row => (
          <li key={row.href + row.nome} className="border-t border-divider first:border-t-0">
            <Link href={rowHref(row, edition)} prefetch={false} className="flex min-h-[52px] items-center gap-2.5 px-3.5 py-1.5">
              <span className="min-w-0 flex-1">
                <span className="block text-base leading-tight text-foreground"><Highlighted row={row} query={query} settled={settled} /></span>
                <InEnglish shown={englishOf(row.nome, edition === "2014" && row.en ? [...row.en].reverse() : row.en, query, { wordStart: true, settled })} />
                {[HOMEBREW_LABEL, GRIMORIO_LABEL].some(label => row.label.startsWith(`${label} · `))
                  ? <span className="flex flex-wrap items-center gap-1.5 text-[14px] text-muted"><HomebrewPill ours={row.label.startsWith(`${GRIMORIO_LABEL} · `)} />{row.label.slice(row.label.indexOf(" · ") + 3)}</span>
                  : <span className="block text-[14px] text-muted">{row.label}</span>}
              </span>
              <ChevronRight size={16} strokeWidth={2.4} className="shrink-0 text-[#B9A57C]" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      {group.rows.length < group.total && (
        <button type="button" onClick={() => onExpand(group.section)}
          className="mt-1.5 min-h-11 px-1 text-[15px] font-bold text-primary">
          Mostra tutti ({group.total})
        </button>
      )}
    </section>
  ));
}

/**
 * Full-screen search: filters by section, results while typing, grouped by section. Results of
 * «la tua edizione» come first; those of the other edition only at «Cerca anche nel 2014».
 */
export function SearchPanel({ initialQuery, initialSection, onClose }: SearchPanelProps) {
  const [query, setQuery] = useState(initialQuery);
  const [section, setSection] = useState<SearchSectionKey | undefined>(initialSection as SearchSectionKey | undefined);
  const [expanded, setExpanded] = useState<SearchSectionKey[]>([]);
  const [index, setIndex] = useState<SearchIndex>();
  const [failed, setFailed] = useState(false);
  const [alsoOther, setAlsoOther] = useState(false);
  const { edition } = useUserEdition();
  const other = otherEdition(edition);
  const input = useRef<HTMLInputElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);

  useEffect(() => {
    input.current?.focus();
    let alive = true;
    loadIndex().then(data => { if (alive) setIndex(data); }, () => { if (alive) setFailed(true); });
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") close.current(); };
    window.addEventListener("keydown", escape);
    document.body.style.overflow = "hidden";
    return () => { alive = false; window.removeEventListener("keydown", escape); document.body.style.overflow = ""; };
  }, []);

  // Text and filter stay in the address: "back" from a result comes here again.
  useEffect(() => {
    const params = new URLSearchParams({ cerca: query });
    if (section) params.set("sezione", section);
    window.history.replaceState(window.history.state, "", `/?${params}`);
  }, [query, section]);

  const rows = useMemo(() => splitByEdition(index ? rowsOf(index) : [], edition), [index, edition]);
  const settled = useSettledQuery(query);
  const ownGroups = useMemo(() => (index ? search(index, rows.own, query, { section, expanded, settled }) : []), [index, rows, query, section, expanded, settled]);
  const otherGroups = useMemo(() => (index ? search(index, rows.other, query, { section, expanded, settled }) : []), [index, rows, query, section, expanded, settled]);
  usePreparedNames(() => rows.own.concat(rows.other).map(row => row.alias ?? row.nome), rows);
  // A name found exactly in the other edition beats the similar ones of this edition («cesto»: Cesto in 2024, not
  // «Custodia…» in 2014): «Nessun risultato nel 2014» and «Cerca anche nel 2024», as before the typos.
  const exactOf = (list: SearchGroup[]) => list.reduce((sum, group) => sum + group.exact, 0);
  const groups = !exactOf(ownGroups) && exactOf(otherGroups) ? [] : ownGroups;
  const ownTotal = groups.reduce((sum, group) => sum + group.total, 0);
  const otherTotal = otherGroups.reduce((sum, group) => sum + group.total, 0);
  const total = ownTotal + (alsoOther ? otherTotal : 0);
  const typed = query.trim().length;
  // Counted only with the consent to the statistics: the word and the results of the site (both editions).
  // Only the exact results: a search found only with typos still counts as «cercano senza trovare».
  useReportSearch(query, exactOf(ownGroups) + exactOf(otherGroups), !!index, "globale");
  const choose = (value: string) => { setQuery(value); setExpanded([]); input.current?.focus(); };
  const suggestion = suggestionOf(groups) ?? (!groups.length && alsoOther ? suggestionOf(otherGroups) : null);

  return (
    <div role="dialog" aria-modal="true" aria-label="Cerca in tutto il Grimorio" className="fixed inset-0 z-[70] flex flex-col bg-background">
      <div className="border-b-[1.5px] border-divider px-4 pb-2.5 pt-[calc(16px+env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex max-w-2xl items-center gap-2.5">
          <label className="flex min-h-[52px] min-w-0 flex-1 items-center gap-2.5 rounded-[26px] border-2 border-primary bg-card px-3.5">
            <Search size={22} strokeWidth={2.2} className="shrink-0 text-primary" aria-hidden="true" />
            <span className="sr-only">Cerca in tutto il Grimorio</span>
            <input ref={input} {...SEARCH_INPUT} value={query} onChange={event => { setQuery(event.target.value); setExpanded([]); }}
              placeholder={`Cerca nel Grimorio ${edition}…`}
              aria-controls="search-results" aria-describedby="search-count"
              className="h-12 min-w-0 flex-1 bg-transparent text-[17px] text-foreground outline-none placeholder:text-[#8a7a66]" />
          </label>
          <button type="button" onClick={onClose} className="min-h-11 min-w-11 px-1 text-[15px] font-bold text-primary">Annulla</button>
        </div>
        {/* Until the index arrives, the place of the section filters is kept: the results do not jump down. */}
        {!index && <div className="mt-2.5 h-11" aria-hidden="true" />}
        {index && (
          <div role="group" aria-label="Sezioni" className="no-scrollbar -mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4">
            {[{ k: undefined, t: "Tutto" }, ...index.sections].map(item => {
              const on = section === item.k;
              return (
                <button key={item.t} type="button" aria-pressed={on} onClick={() => { setSection(item.k); setExpanded([]); }}
                  className={`min-h-11 shrink-0 whitespace-nowrap rounded-[22px] border-[1.5px] px-3.5 text-[15px] font-semibold ${on ? "border-primary bg-primary text-primary-foreground" : "border-chip-border bg-card text-primary"}`}>
                  {item.t}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div id="search-results" className="flex-1 overflow-y-auto px-4 pb-[calc(24px+env(safe-area-inset-bottom,0px))] pt-1.5">
        <div className="mx-auto max-w-2xl">
          <p id="search-count" role="status" aria-live="polite" className="sr-only">
            {typed && index ? (total ? `${total} ${total === 1 ? "risultato" : "risultati"}` : `Nessun risultato per «${query.trim()}»`) : ""}
          </p>
          {failed && <p className="py-8 text-center text-[15px] text-muted">La ricerca non è disponibile: manca la connessione e l’indice non è ancora salvato sul telefono.</p>}
          {!failed && !index && typed > 0 && <p className="py-8 text-center text-[15px] text-muted">Caricamento…</p>}
          {!typed && (
            <div className="pt-3.5">
              <p className="text-[15px] text-muted">Prova a scrivere…</p>
              <ul className="mt-2.5 flex flex-wrap gap-2" aria-label="Esempi">
                {EXAMPLES.map(example => (
                  <li key={example}>
                    <button type="button" onClick={() => choose(example)} className="min-h-11 rounded-[22px] bg-elevated px-4 text-[15px] text-muted">{example}</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {typed > 0 && index && !total && <p className="py-8 text-center text-[15px] text-muted">Nessun risultato per «{query.trim()}»{otherTotal ? ` nel ${edition}` : ""}</p>}
          {typed > 0 && suggestion && <DidYouMean name={suggestion} onPick={choose} className="mt-3" />}
          {/* Only similar names (no exact result in any section): never mixed with the right ones. */}
          {typed > 0 && groups.length > 0 && groups.every(group => !group.exact) && <SimilarResultsHeading className="!mt-4 !mb-0" />}
          <Groups groups={groups} query={query} settled={settled} edition={edition} prefix="gruppo" onExpand={key => setExpanded(list => [...list, key])} />
          {typed > 0 && otherTotal > 0 && !alsoOther && (
            <button type="button" onClick={() => setAlsoOther(true)}
              className="mt-4 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-[12px] border-[1.5px] border-chip-border bg-card px-4 text-[15px] font-bold text-primary">
              Cerca anche nel {other} ({otherTotal})
            </button>
          )}
          {typed > 0 && alsoOther && otherTotal > 0 && (
            <div className="mt-6 border-t-[1.5px] border-divider pt-2">
              <p className="px-0.5 pt-2 text-[14px] font-bold uppercase tracking-[0.06em] text-muted">Solo nel {other}</p>
              <Groups groups={otherGroups} query={query} settled={settled} edition={edition} prefix="altro" onExpand={key => setExpanded(list => [...list, key])} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
