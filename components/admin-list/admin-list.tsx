"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ExternalLink, MoreHorizontal, PenLine, Plus, Search, SlidersHorizontal, Star, Trash2, X } from "lucide-react";

import { FAVORITES_NOTE } from "@/lib/analytics-events";
import { deleteSpellAction } from "@/app/actions/admin";
import { deleteHomebrewAction } from "@/app/actions/admin-homebrew";
import { deleteMonsterAction } from "@/app/actions/admin-monsters";
import { MonsterEditor } from "@/components/admin-monster-editor";
import { SpellEditor } from "@/components/admin-spell-editor";
import { useCardVisibility } from "@/components/admin-card-eye";
import { FieldDiff } from "@/components/admin-srd/diff-text";
import { RestoreSrdButton } from "@/components/admin-srd/restore-button";
import { NewHomebrewDialog } from "@/components/homebrew/admin-proposals";
import {
  NO_FILTERS, activeFilterCount, filterCounts, filterRows, groupRows,
  type AdminListData, type AdminRow, type ListFilters, type SourceFilter, type VisibilityFilter,
} from "@/lib/admin-list-types";
import { fold } from "@/lib/search";
import { SEARCH_INPUT } from "@/lib/search-input";

const AMBER_PILL = "inline-flex items-center rounded-full bg-[#FCEFD0] px-2 text-[12px] font-bold leading-5 text-[#7A4E00]";
const SOURCE_PILL = "inline-flex items-center rounded-full border border-[#DDCFAE] bg-[#F6EFDF] px-2 text-[12px] font-semibold leading-5 text-[#5E4E3E]";

/**
 * Every list of the reserved area, the same for spells, creatures and the other contents, in both editions:
 * search, «Filtri», the three counters, the active filters as pills, groups with shortcuts, compact rows with the
 * visible/hidden switch, the menu of a row (long press, or ⋯ on a computer), the selection and the «+» button.
 * On a computer the filters stay open on the left and the rows are a table.
 */
export function AdminList(props: { data: AdminListData; create?: "spell" | "monster" }) {
  // A new edition (or list) starts afresh: the switches, the filters and the selection belong to the rows on screen.
  return <AdminListView key={`${props.data.section}-${props.data.edition}`} {...props} />;
}

function AdminListView({ data, create }: { data: AdminListData; create?: "spell" | "monster" }) {
  const router = useRouter();
  const hideable = data.kind !== "contenuto";
  const initiallyHidden = useMemo(() => data.rows.filter(row => row.hidden).map(row => row.id), [data.rows]);
  const visibility = useCardVisibility(data.kind === "mostro" ? "mostro" : "incantesimo", initiallyHidden);
  const isHidden = (row: AdminRow) => row.hidden !== null && visibility.isHidden(row.id);

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<ListFilters>(NO_FILTERS);
  const [panelOpen, setPanelOpen] = useState(false);
  const [draft, setDraft] = useState<ListFilters>(NO_FILTERS);
  const [menuRow, setMenuRow] = useState<AdminRow | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState<"choose" | "spell" | "monster" | "homebrew" | null>(null);

  const searched = useMemo(() => {
    const wanted = fold(query.trim());
    return wanted ? data.rows.filter(row => fold(row.name).includes(wanted) || fold(row.sub).includes(wanted)) : data.rows;
  }, [data.rows, query]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- isHidden reads the visibility state, a dependency below
  const counts = useMemo(() => filterCounts(searched, isHidden), [searched, visibility]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shown = useMemo(() => filterRows(searched, filters, isHidden), [searched, filters, visibility]);
  const groups = useMemo(() => groupRows(shown), [shown]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const draftCount = useMemo(() => filterRows(searched, draft, isHidden).length, [searched, draft, visibility]);

  const openPanel = () => { setDraft(filters); setPanelOpen(true); };
  const toggleSelected = (id: string) => setSelected(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const endSelection = () => { setSelecting(false); setSelected(new Set()); };
  const bulk = async (hide: boolean) => {
    const cards = shown.filter(row => selected.has(row.id) && row.hidden !== null && isHidden(row) !== hide).map(row => ({ id: row.id, nome: row.name }));
    endSelection();
    await visibility.setMany(cards, hide);
  };
  const selectedRows = shown.filter(row => selected.has(row.id));
  const toHide = selectedRows.filter(row => row.hidden !== null && !isHidden(row)).length;
  const toShow = selectedRows.filter(row => row.hidden !== null && isHidden(row)).length;

  const activeChips: { label: string; clear: () => void }[] = [
    ...(filters.visibility !== "tutte" ? [{ label: filters.visibility === "nascoste" ? "Nascoste" : "Visibili", clear: () => setFilters(f => ({ ...f, visibility: "tutte" as const })) }] : []),
    ...(filters.source !== "tutte" ? [{ label: filters.source === "srd" ? "SRD" : filters.source === "creati" ? "Creati da voi" : "NO SRD", clear: () => setFilters(f => ({ ...f, source: "tutte" as const })) }] : []),
    ...(filters.modified ? [{ label: "SRD modificate", clear: () => setFilters(f => ({ ...f, modified: false })) }] : []),
    ...(filters.reviewNames ? [{ label: "Nomi da rivedere", clear: () => setFilters(f => ({ ...f, reviewNames: false })) }] : []),
  ];
  const counters: { label: string; n: number; on: boolean; apply: () => void; key: string }[] = [
    ...(hideable ? [{ key: "nosrd", label: "NO SRD", n: counts.nosrd, on: filters.source === "nosrd", apply: () => setFilters(f => ({ ...f, source: f.source === "nosrd" ? "tutte" : "nosrd" })) }] : []),
    // «Creati da voi» beside «NO SRD» (PROMPT 22): only on the list that has them.
    ...(data.kind === "mostro" ? [{ key: "creati", label: "Creati da voi", n: counts.creati, on: filters.source === "creati", apply: () => setFilters(f => ({ ...f, source: f.source === "creati" ? "tutte" : "creati" })) }] : []),
    { key: "modificate", label: "SRD modificate", n: counts.modified, on: filters.modified, apply: () => setFilters(f => ({ ...f, modified: !f.modified })) },
    ...(hideable ? [{ key: "nascoste", label: "Nascoste", n: counts.hidden, on: filters.visibility === "nascoste", apply: () => setFilters(f => ({ ...f, visibility: f.visibility === "nascoste" ? "tutte" : "nascoste" })) }] : []),
  ];

  return (
    <main className="mx-auto max-w-[1200px] px-4 pb-32 pt-2" data-admin-list={data.section} data-edition={data.edition}>
      {selecting ? (
        <div className="sticky top-[61px] z-20 -mx-4 flex min-h-14 items-center gap-2 bg-[#2B2118] px-4 text-[#FFFBF0]" data-selection-bar="">
          <button type="button" onClick={endSelection} className="min-h-11 px-2 text-[15px] font-bold">Annulla</button>
          <span className="flex-1 text-center text-[15px] font-semibold" aria-live="polite">{selected.size} {selected.size === 1 ? "selezionata" : "selezionate"}</span>
          <button type="button" onClick={() => setSelected(new Set(shown.filter(row => row.hidden !== null).map(row => row.id)))} className="min-h-11 px-2 text-[15px] font-bold text-[#E0A21A]">Tutte</button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Link href="/admin/contenuti" className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-[15px] font-bold text-[#7A1F2B]"><ChevronLeft size={18} aria-hidden="true" /> Contenuti</Link>
          <span className="flex-1" />
          {hideable && <button type="button" onClick={() => setSelecting(true)} className="min-h-11 rounded-full px-3 text-[15px] font-bold text-[#7A1F2B]">Seleziona</button>}
        </div>
      )}
      <h1 className="mt-1 font-serif text-[30px] font-bold leading-tight text-[#7A1F2B]">{data.title} <span className="text-[18px] font-semibold text-[#5E4E3E]">{data.edition}</span></h1>

      <div className="mt-3 lg:grid lg:grid-cols-[260px_1fr] lg:items-start lg:gap-6">
        <aside className="hidden lg:sticky lg:top-[76px] lg:block" aria-label="Filtri">
          <FilterPanel value={filters} onChange={setFilters} counts={counts} hideable={hideable} />
          <p className="mt-3 text-[14px] text-[#5E4E3E]" aria-live="polite">{shown.length} {shown.length === 1 ? "risultato" : "risultati"}</p>
        </aside>

        <div className="min-w-0">
          <div className="flex gap-2">
            <label className="relative block flex-1">
              <span className="sr-only">Cerca in {data.title}</span>
              <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5E4E3E]" aria-hidden="true" />
              <input {...SEARCH_INPUT} value={query} onChange={event => setQuery(event.target.value)} placeholder={data.kind === "incantesimo" ? "Cerca per nome o scuola…" : data.kind === "mostro" ? "Cerca per nome o tipo…" : `Cerca in ${data.title.toLowerCase()}…`}
                className="block min-h-12 w-full rounded-[14px] border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0] pl-10 pr-3 text-[16px] outline-none placeholder:text-[#7A6A58] focus:border-[#7A1F2B]" />
            </label>
            <button type="button" onClick={openPanel} aria-label={`Filtri${activeFilterCount(filters) ? ` · ${activeFilterCount(filters)} attivi` : ""}`}
              className="relative inline-flex min-h-12 items-center gap-2 rounded-[14px] border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0] px-3.5 text-[15px] font-bold text-[#7A1F2B] lg:hidden">
              <SlidersHorizontal size={18} aria-hidden="true" /> Filtri
              {activeFilterCount(filters) > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-[#7A1F2B] px-1 text-[12px] leading-5 text-[#FFFBF0]">{activeFilterCount(filters)}</span>}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Contatori">
            {counters.map(counter => (
              <button key={counter.key} type="button" aria-pressed={counter.on} onClick={counter.apply} data-counter={counter.key}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border-[1.5px] px-3.5 text-[14px] font-bold ${counter.on ? "border-[#7A1F2B] bg-[#7A1F2B] text-[#FFFBF0]" : counter.key === "modificate" ? "border-[#E0A21A] bg-[#FCEFD0] text-[#7A4E00]" : "border-[#DDCFAE] bg-[#FFFBF0] text-[#2B2118]"}`}>
                {counter.label} <span className="tabular-nums">{counter.n}</span>
              </button>
            ))}
          </div>

          {activeChips.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2" aria-label="Filtri attivi">
              {activeChips.map(chip => (
                <li key={chip.label}>
                  <button type="button" onClick={chip.clear} aria-label={`Togli il filtro ${chip.label}`}
                    className="inline-flex min-h-11 items-center gap-1 rounded-full bg-[#2B2118] pl-3.5 pr-2 text-[14px] font-semibold text-[#FFFBF0]">
                    {chip.label} <X size={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {groups.length > 1 && (
            <nav aria-label="Vai al gruppo" className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
              {groups.map(group => (
                <button key={group.key} type="button" onClick={() => scrollToGroup(group.key)} className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-[#DDCFAE] bg-[#FFFBF0] px-3.5 text-[14px] font-semibold text-[#5E4E3E]">{group.label}</button>
              ))}
            </nav>
          )}

          <p className="mt-3 text-[14px] text-[#5E4E3E] lg:hidden" aria-live="polite" data-result-count={shown.length}>{shown.length} {shown.length === 1 ? "risultato" : "risultati"}</p>

          {shown.length === 0 ? (
            <p className="mt-3 rounded-[14px] border border-dashed border-[#DDCFAE] px-4 py-8 text-center text-[15px] text-[#5E4E3E]">Nessuna scheda con questi filtri.</p>
          ) : (
            <>
              {/* Phone and tablet: compact rows. */}
              <div className="lg:hidden">
                {groups.map(group => (
                  <section key={group.key} aria-labelledby={`gruppo-${group.key}`} className="mt-4" data-list-group={group.label}>
                    <h2 id={`gruppo-${group.key}`} data-group-anchor={group.key} className="scroll-mt-32 px-1 pb-1.5 text-[13px] font-bold uppercase tracking-[0.1em] text-[#5E4E3E]">{group.label} · {group.rows.length}</h2>
                    <ul className="divide-y divide-[#DDCFAE]/70 overflow-hidden rounded-[14px] border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0]">
                      {group.rows.map(row => (
                        <PhoneRow key={row.id} row={row} hidden={isHidden(row)} selecting={selecting} selected={selected.has(row.id)}
                          onSelect={() => toggleSelected(row.id)} onToggle={() => visibility.toggle(row.id, row.name)} onMenu={() => setMenuRow(row)} />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
              {/* Computer: a table, with the menu ⋯ on every row. */}
              <table className="mt-4 hidden w-full border-separate border-spacing-0 overflow-hidden rounded-[14px] border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0] text-left lg:table">
                <thead className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#5E4E3E]">
                  <tr>
                    {selecting && <th className="w-12 px-3 py-2"><span className="sr-only">Selezione</span></th>}
                    <th className="w-16 px-3 py-2">{data.kind === "incantesimo" ? "Liv." : data.kind === "mostro" ? "GS" : ""}</th>
                    <th className="px-3 py-2">Nome</th>
                    <th className="px-3 py-2">{data.kind === "incantesimo" ? "Scuola" : "Tipo"}</th>
                    <th className="px-3 py-2">Provenienza e avvisi</th>
                    {hideable && <th className="w-28 px-3 py-2">Visibilità</th>}
                    <th className="w-14 px-3 py-2"><span className="sr-only">Azioni</span></th>
                  </tr>
                </thead>
                {groups.map(group => (
                  <tbody key={group.key} data-list-group={group.label}>
                    <tr><th colSpan={7} data-group-anchor={group.key} className="scroll-mt-24 border-t border-[#DDCFAE] bg-[#F6EFDF] px-3 py-1.5 text-[13px] font-bold uppercase tracking-[0.1em] text-[#5E4E3E]">{group.label} · {group.rows.length}</th></tr>
                    {group.rows.map(row => (
                      <TableRow key={row.id} row={row} hidden={isHidden(row)} hideable={hideable} selecting={selecting} selected={selected.has(row.id)}
                        onSelect={() => toggleSelected(row.id)} onToggle={() => visibility.toggle(row.id, row.name)} onMenu={() => setMenuRow(row)} />
                    ))}
                  </tbody>
                ))}
              </table>
            </>
          )}
          {(data.kind === "incantesimo" || data.kind === "mostro") && (
            <p className="mt-3 px-1 text-[12px] text-[#5E4E3E]" data-saves-note="">{FAVORITES_NOTE}</p>
          )}
        </div>
      </div>

      {selecting ? (
        <div className="fixed inset-x-0 bottom-0 z-40 flex gap-3 border-t border-[#DDCFAE] bg-[#FFFBF0] px-4 pb-[calc(12px+env(safe-area-inset-bottom,0px))] pt-3 lg:pl-64" data-selection-actions="">
          <button type="button" disabled={!toHide} onClick={() => void bulk(true)} className="min-h-12 flex-1 rounded-full bg-[#2B2118] text-[16px] font-bold text-[#FFFBF0] disabled:opacity-40">Nascondi {toHide}</button>
          <button type="button" disabled={!toShow} onClick={() => void bulk(false)} className="min-h-12 flex-1 rounded-full bg-[#1F6B45] text-[16px] font-bold text-[#FFFBF0] disabled:opacity-40">Mostra {toShow}</button>
        </div>
      ) : create && (
        <button type="button" onClick={() => setCreating(create === "monster" ? "choose" : "spell")} aria-label="Nuovo" title={create === "monster" ? "Nuova creatura" : "Nuovo incantesimo"}
          className="fixed bottom-[calc(20px+env(safe-area-inset-bottom,0px))] right-5 z-40 grid size-14 place-items-center rounded-full bg-[#7A1F2B] text-[#FFFBF0] shadow-lg focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#E0A21A]" data-create-button="">
          <Plus size={28} strokeWidth={2.4} aria-hidden="true" />
        </button>
      )}

      {panelOpen && (
        <Sheet title="Filtri" onClose={() => setPanelOpen(false)}>
          <FilterPanel value={draft} onChange={setDraft} counts={counts} hideable={hideable} />
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => setDraft(NO_FILTERS)} className="min-h-12 rounded-full border-[1.5px] border-[#DDCFAE] px-5 text-[16px] font-bold text-[#5E4E3E]">Azzera</button>
            <button type="button" onClick={() => { setFilters(draft); setPanelOpen(false); }} className="min-h-12 flex-1 rounded-full bg-[#7A1F2B] text-[16px] font-bold text-[#FFFBF0]">Mostra {draftCount} {draftCount === 1 ? "risultato" : "risultati"}</button>
          </div>
        </Sheet>
      )}

      {menuRow && <RowMenu row={menuRow} kind={data.kind} onClose={() => setMenuRow(null)} onDeleted={() => { setMenuRow(null); router.refresh(); }} />}

      {creating === "choose" && (
        <Sheet title="Nuova creatura" onClose={() => setCreating(null)}>
          <p className="text-[15px] text-[#5E4E3E]">Scheda o «Creati da voi»?</p>
          <div className="mt-3 flex flex-col gap-2">
            <button type="button" onClick={() => setCreating("monster")} className="min-h-12 rounded-[14px] bg-[#7A1F2B] text-[16px] font-bold text-[#FFFBF0]">Scheda</button>
            <button type="button" onClick={() => setCreating("homebrew")} className="min-h-12 rounded-[14px] border-[1.5px] border-[#E0A21A] bg-[#FCEFD0] text-[16px] font-bold text-[#7A4E00]">Creati da voi</button>
          </div>
        </Sheet>
      )}
      {creating === "spell" && <SpellEditor spell={null} edition={data.edition} onClose={saved => { setCreating(null); if (saved) router.refresh(); }} />}
      {creating === "monster" && <MonsterEditor monster={null} edition={data.edition} onClose={saved => { setCreating(null); if (saved) router.refresh(); }} />}
      {creating === "homebrew" && <NewHomebrewDialog edition={data.edition} onClose={() => setCreating(null)} />}
      {visibility.notice}
    </main>
  );
}

/** A shortcut pill: the header of the group shown on this screen (the rows of a phone or the table of a computer). */
function scrollToGroup(key: string) {
  const target = [...document.querySelectorAll<HTMLElement>(`[data-group-anchor="${CSS.escape(key)}"]`)].find(element => element.offsetParent !== null);
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** The small line of a row: type, pill of a NO SRD card, amber warnings. */
function RowLine({ row }: { row: AdminRow }) {
  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] leading-5 text-[#5E4E3E]">
      <span>{row.sub}</span>
      {row.pill && <span className={SOURCE_PILL} data-row-pill={row.pill}>{row.pill}</span>}
      {!!row.modified?.length && <span className={AMBER_PILL} data-warning="srd-modificata">SRD modificata</span>}
      {!!row.reviewNames?.length && <span className={AMBER_PILL} data-warning="nome-da-rivedere" title={row.reviewNames.join(", ")}>Nome da rivedere</span>}
      <Saves count={row.saves} />
    </span>
  );
}

/** «★ N»: how many people have the card in their favorites (PROMPT 10); nothing when none. */
function Saves({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <span className="inline-flex items-center gap-0.5 font-semibold tabular-nums text-[#7A1F2B]" data-saves={count}
      aria-label={`Nei preferiti di ${count} ${count === 1 ? "persona" : "persone"}`} title={`Nei preferiti di ${count} ${count === 1 ? "persona" : "persone"}`}>
      <Star size={13} strokeWidth={2} className="fill-[#7A1F2B]" aria-hidden="true" />{count}
    </span>
  );
}

/** Green: the visitors see it; grey: hidden. A real switch, 44 px to tap. */
function VisibilitySwitch({ name, hidden, onToggle }: { name: string; hidden: boolean; onToggle: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={!hidden} onClick={onToggle} aria-label={`Visibile sul sito: ${name}`} data-card-switch=""
      title={hidden ? "Nascosta: tocca per mostrarla" : "Visibile: tocca per nasconderla"}
      className="grid size-11 shrink-0 place-items-center rounded-full focus-visible:outline-[3px] focus-visible:outline-[#E0A21A]">
      <span className={`relative h-[26px] w-[44px] rounded-full transition-colors ${hidden ? "bg-[#A99B87]" : "bg-[#1F6B45]"}`} aria-hidden="true">
        <span className={`absolute top-[3px] size-5 rounded-full bg-white shadow transition-[left] ${hidden ? "left-[3px]" : "left-[21px]"}`} />
      </span>
    </button>
  );
}

function useLongPress(onLongPress: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const fired = useRef(false);
  const start = () => { fired.current = false; clearTimeout(timer.current); timer.current = setTimeout(() => { fired.current = true; onLongPress(); }, 500); };
  const cancel = () => clearTimeout(timer.current);
  useEffect(() => () => clearTimeout(timer.current), []);
  return {
    onPointerDown: start, onPointerUp: cancel, onPointerLeave: cancel, onPointerCancel: cancel,
    onContextMenu: (event: React.MouseEvent) => { event.preventDefault(); cancel(); fired.current = true; onLongPress(); },
    /** After a long press the tap that ends it does not open the editor. */
    onClickCapture: (event: React.MouseEvent) => { if (fired.current) { event.preventDefault(); event.stopPropagation(); fired.current = false; } },
  };
}

function Checkbox({ checked, name, onChange }: { checked: boolean; name: string; onChange: () => void }) {
  return (
    <label className="grid size-11 shrink-0 cursor-pointer place-items-center">
      <input type="checkbox" checked={checked} onChange={onChange} aria-label={`Seleziona ${name}`} className="size-5 accent-[#7A1F2B]" />
    </label>
  );
}

function PhoneRow({ row, hidden, selecting, selected, onSelect, onToggle, onMenu }: {
  row: AdminRow; hidden: boolean; selecting: boolean; selected: boolean; onSelect: () => void; onToggle: () => void; onMenu: () => void;
}) {
  const press = useLongPress(onMenu);
  return (
    <li data-card-row={row.id} data-public-href={row.publicHref} data-hidden={hidden ? "" : undefined} className={`flex min-h-[60px] items-center gap-1 pl-2 pr-1 [-webkit-touch-callout:none] ${hidden ? "bg-[#F1EBDD]" : ""}`} {...press}>
      {selecting && (row.hidden !== null ? <Checkbox checked={selected} name={row.name} onChange={onSelect} /> : <span className="w-11 shrink-0" />)}
      <div className={`min-w-0 flex-1 py-1.5 pl-2 ${hidden ? "opacity-55" : ""}`}>
        {selecting ? <span className="block break-words text-[16px] font-semibold leading-snug">{row.name}</span>
          : <Link href={row.editHref} prefetch={false} className="block break-words text-[16px] font-semibold leading-snug text-[#2B2118]">{row.name}</Link>}
        <RowLine row={row} />
      </div>
      {row.hidden !== null && !selecting && <VisibilitySwitch name={row.name} hidden={hidden} onToggle={onToggle} />}
    </li>
  );
}

function TableRow({ row, hidden, hideable, selecting, selected, onSelect, onToggle, onMenu }: {
  row: AdminRow; hidden: boolean; hideable: boolean; selecting: boolean; selected: boolean; onSelect: () => void; onToggle: () => void; onMenu: () => void;
}) {
  const cell = "border-t border-[#DDCFAE]/70 px-3 py-2 align-middle";
  return (
    <tr data-card-row={row.id} data-public-href={row.publicHref} data-hidden={hidden ? "" : undefined} className={hidden ? "bg-[#F1EBDD] text-[#2B2118]/60" : ""}>
      {selecting && <td className={cell}>{row.hidden !== null && <Checkbox checked={selected} name={row.name} onChange={onSelect} />}</td>}
      <td className={`${cell} font-serif text-[16px] font-bold tabular-nums text-[#7A1F2B]`}>{row.lead}</td>
      <td className={cell}><Link href={row.editHref} prefetch={false} className="text-[15px] font-semibold text-[#2B2118] hover:underline">{row.name}</Link>{row.saves ? <span className="ml-2 text-[13px]"><Saves count={row.saves} /></span> : null}</td>
      <td className={`${cell} text-[14px] text-[#5E4E3E]`}>{row.sub}</td>
      <td className={cell}>
        <span className="flex flex-wrap gap-1">
          {row.pill ? <span className={SOURCE_PILL}>{row.pill}</span> : <span className="text-[13px] text-[#5E4E3E]">SRD</span>}
          {!!row.modified?.length && <span className={AMBER_PILL}>SRD modificata</span>}
          {!!row.reviewNames?.length && <span className={AMBER_PILL} title={row.reviewNames.join(", ")}>Nome da rivedere</span>}
        </span>
      </td>
      {hideable && <td className={cell}>{row.hidden !== null && <span className="flex items-center gap-1"><VisibilitySwitch name={row.name} hidden={hidden} onToggle={onToggle} /><span className="text-[13px]">{hidden ? "Nascosta" : "Visibile"}</span></span>}</td>}
      <td className={cell}>
        <button type="button" onClick={onMenu} aria-label={`Azioni: ${row.name}`} className="grid size-11 place-items-center rounded-full text-[#5E4E3E] hover:bg-[#F6EFDF]">
          <MoreHorizontal size={20} aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}

/** The menu of a row: open on the site, delete (cards added here), restore the SRD text, rename. */
function RowMenu({ row, kind, onClose, onDeleted }: { row: AdminRow; kind: AdminListData["kind"]; onClose: () => void; onDeleted: () => void }) {
  const [error, setError] = useState("");
  const item = "flex min-h-12 w-full items-center gap-3 rounded-[12px] px-3 text-left text-[16px] font-semibold hover:bg-[#F6EFDF]";
  const remove = async () => {
    if (!row.deletable || !window.confirm(`Eliminare "${row.name}"? L'operazione è definitiva.`)) return;
    const form = new FormData();
    form.set("id", row.id);
    const action = row.deletable === "spell" ? deleteSpellAction : row.deletable === "homebrew" ? deleteHomebrewAction : deleteMonsterAction;
    try {
      const result = await action(form);
      if (result.ok) onDeleted(); else setError(result.error);
    } catch {
      setError("Eliminazione non riuscita. Controlla la connessione e riprova.");
    }
  };
  return (
    <Sheet title={row.name} onClose={onClose}>
      <ul className="flex flex-col gap-1" data-row-menu={row.id}>
        <li><Link href={row.publicHref} prefetch={false} className={item}><ExternalLink size={18} aria-hidden="true" /> Apri sul sito</Link></li>
        {!!row.reviewNames?.length && <li><Link href={`${row.editHref}${row.editHref.includes("?") ? "&" : "?"}campo=nome`} prefetch={false} className={item}><PenLine size={18} aria-hidden="true" /> Rinomina</Link></li>}
        {kind !== "contenuto" && !!row.modified?.length && (
          <li>
            <RestoreSrdButton kind={kind} id={row.id} name={row.name} triggerClassName={item}>
              {row.modified.map(field => <FieldDiff key={field.label} label={field.label} parts={field.diff} />)}
            </RestoreSrdButton>
          </li>
        )}
        {row.deletable && <li><button type="button" onClick={() => void remove()} className={`${item} text-[#A3262E]`}><Trash2 size={18} aria-hidden="true" /> Elimina</button></li>}
      </ul>
      {error && <p role="alert" className="mt-2 text-[14px] font-semibold text-[#A3262E]">{error}</p>}
    </Sheet>
  );
}

/** A panel that rises from the bottom on a phone and sits in the middle on a computer. */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return (
    <dialog ref={dialog} onClose={onClose} onClick={event => { if (event.target === dialog.current) dialog.current?.close(); }} aria-label={title}
      className="m-0 mt-auto max-h-[88dvh] w-full max-w-none overflow-y-auto rounded-t-[22px] bg-[#FFFBF0] p-0 text-[#2B2118] shadow-2xl backdrop:bg-[#2B2118]/50 sm:m-auto sm:max-w-lg sm:rounded-[22px]">
      <div className="p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-serif text-[22px] font-bold leading-tight">{title}</h2>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Chiudi" className="grid size-11 place-items-center rounded-full text-[#5E4E3E]"><X size={22} aria-hidden="true" /></button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

/** The three groups of filters, the same in the panel of a phone and on the left of a computer. */
function FilterPanel({ value, onChange, counts, hideable }: {
  value: ListFilters; onChange: (value: ListFilters) => void; counts: ReturnType<typeof filterCounts>; hideable: boolean;
}) {
  const chip = (on: boolean, amber = false) => `inline-flex min-h-11 items-center rounded-full border-[1.5px] px-3.5 text-[14px] font-semibold ${on ? (amber ? "border-[#7A4E00] bg-[#7A4E00] text-[#FFFBF0]" : "border-[#7A1F2B] bg-[#7A1F2B] text-[#FFFBF0]") : amber ? "border-[#E0A21A] bg-[#FCEFD0] text-[#7A4E00]" : "border-[#DDCFAE] bg-[#FFFBF0] text-[#2B2118]"}`;
  const label = "mb-2 text-[13px] font-bold uppercase tracking-[0.1em]";
  const visibility: [VisibilityFilter, string][] = [["tutte", "Tutte"], ["visibili", "Visibili"], ["nascoste", `Nascoste (${counts.hidden})`]];
  const source: [SourceFilter, string][] = [["tutte", `Tutte (${counts.all})`], ["srd", `SRD (${counts.srd})`], ["nosrd", `NO SRD (${counts.nosrd})`], ...(counts.creati ? [["creati", `Creati da voi (${counts.creati})`] as [SourceFilter, string]] : [])];
  return (
    <div className="flex flex-col gap-4" data-filter-panel="">
      {hideable && (
        <fieldset>
          <legend className={`${label} text-[#5E4E3E]`}>Visibilità</legend>
          <div className="flex flex-wrap gap-2">{visibility.map(([key, text]) => <button key={key} type="button" aria-pressed={value.visibility === key} onClick={() => onChange({ ...value, visibility: key })} className={chip(value.visibility === key)}>{text}</button>)}</div>
        </fieldset>
      )}
      <fieldset>
        <legend className={`${label} text-[#5E4E3E]`}>Provenienza</legend>
        <div className="flex flex-wrap gap-2">{source.map(([key, text]) => <button key={key} type="button" aria-pressed={value.source === key} onClick={() => onChange({ ...value, source: key })} className={chip(value.source === key)}>{text}</button>)}</div>
      </fieldset>
      <fieldset>
        <legend className={`${label} text-[#7A4E00]`}>Da controllare</legend>
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={value.modified} onClick={() => onChange({ ...value, modified: !value.modified })} className={chip(value.modified, true)}>SRD modificate ({counts.modified})</button>
          {hideable && <button type="button" aria-pressed={value.reviewNames} onClick={() => onChange({ ...value, reviewNames: !value.reviewNames })} className={chip(value.reviewNames, true)}>Nomi da rivedere ({counts.reviewNames})</button>}
        </div>
      </fieldset>
    </div>
  );
}
