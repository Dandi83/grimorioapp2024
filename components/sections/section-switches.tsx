"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronRight } from "lucide-react";

import { setPartStateAction, setSectionStateAction } from "@/app/actions/admin-sections";
import { PART_GROUPS, type PartGroup } from "@/lib/public-sections";
import type { SectionState } from "@/lib/section-visibility";

/**
 * locked: «I mostri creati da voi» while the switch of lib/community.ts is off: hidden from the visitors whatever its
 * state says, so it counts as hidden and its buttons cannot change anything (only a new deploy turns it on).
 */
interface PartRow { id: string; title: string; group: PartGroup; state: SectionState; locked?: boolean }
/** What the visitors really get: a locked part is hidden. */
const shown = (part: PartRow): SectionState => (part.locked ? "nascosta" : part.state);
interface Row { key: string; title: string; where: string; state: SectionState; parts: PartRow[] }

const OPTIONS: { value: SectionState; label: string; active: string }[] = [
  { value: "visibile", label: "Visibile", active: "bg-[#1F6B45] text-white" },
  { value: "in-arrivo", label: "In arrivo", active: "bg-[#E0A21A] text-[#2B2118]" },
  { value: "nascosta", label: "Nascosta", active: "bg-[#2B2118] text-white" },
];
const SAID: Record<SectionState, string> = { visibile: "visibile", "in-arrivo": "in arrivo", nascosta: "nascosta" };

/** «Visibile · In arrivo · Nascosta» of a section or part: green, amber, dark grey when chosen. */
function StateSelector({ title, state, disabled, locked = false, onChange }: { title: string; state: SectionState; disabled: boolean; locked?: boolean; onChange: (state: SectionState) => void }) {
  return (
    <div role="radiogroup" aria-label={`Stato di ${title}`} aria-disabled={locked || undefined} data-locked={locked ? "" : undefined}
      className={`flex shrink-0 overflow-hidden rounded-full border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0] text-[13px] font-bold ${locked ? "opacity-50" : ""}`}>
      {OPTIONS.map(option => (
        <button key={option.value} type="button" role="radio" aria-checked={state === option.value} disabled={disabled || locked} aria-disabled={locked || undefined}
          onClick={() => { if (!locked && state !== option.value) onChange(option.value); }}
          className={`min-h-11 px-2.5 transition-colors sm:px-3.5 ${locked ? "cursor-not-allowed" : ""} ${state === option.value ? option.active : `text-[#5E4E3E] ${locked ? "" : "hover:bg-[#F6EFDF]"}`}`}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

const State = ({ state }: { state: SectionState }) => (state === "nascosta"
  ? <b className="font-bold text-[#2B2118]">Nascosta</b>
  : state === "in-arrivo" ? <b className="font-bold text-[#7A4E00]">In arrivo</b>
    : <b className="font-bold text-[#1F6B45]">Visibile</b>);

/** The parts of one group of a section, each with its three states. */
function PartList({ row, group, pending, busy, change }: {
  row: Row; group: PartGroup; pending: boolean; busy: string | null; change: (section: string, title: string, state: SectionState, part?: string) => void;
}) {
  return (
    <section aria-label={`${PART_GROUPS[group]} · ${row.title}`}>
      <h3 className="pt-2.5 text-[12px] font-bold uppercase tracking-[0.08em] text-[#5E4E3E]">{PART_GROUPS[group]}</h3>
      <ul aria-label={`Parti di ${row.title}: ${PART_GROUPS[group]}`}>
        {row.parts.filter(part => part.group === group).map(part => (
          <li key={part.id} data-part-row={part.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-l-2 border-[#DDCFAE] py-1.5 pl-3">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-snug">{part.title}</p>
              {part.locked ? (
                <>
                  <p className="text-[13px] leading-5"><span data-switch-off="" className="inline-block rounded-[6px] bg-[#E4E0DB] px-1.5 font-bold text-[#4A4038]">Spenta dall’interruttore</span></p>
                  <p className="text-[12px] leading-4 text-[#5E4E3E]">Si accende solo con un nuovo deploy: chiedi il prompt di accensione</p>
                </>
              ) : <p className="text-[13px] leading-5"><State state={part.state} /></p>}
            </div>
            <StateSelector title={part.title} state={part.state} disabled={pending && busy === part.id} locked={part.locked} onChange={state => change(row.key, part.title, state, part.id)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * «Sezioni» (what the visitors see): one row per public section with its three states (green Visibile, amber
 * In arrivo, black Nascosta), for both editions. Under it the parts that are not visible («3 parti nascoste: … ·
 * Gestisci»), which opens every part; the choice of one edition only stays in «Avanzate: scelta diversa per 2014 e
 * 2024». Same data and actions as before: only the look changed.
 */
export function SectionSwitches({ sections }: { sections: Row[] }) {
  const [rows, setRows] = useState(sections);
  const [open, setOpen] = useState<string[]>([]);
  // «Avanzate» starts open where an edition already differs, then stays as the administrator leaves it.
  const [advanced, setAdvanced] = useState<string[]>(() => sections.filter(row => row.parts.some(part => part.group === "edizioni" && shown(part) !== "visibile")).map(row => row.key));
  const [toast, setToast] = useState<{ text: string; error?: boolean; at: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const count = (state: SectionState) => rows.filter(row => row.state === state).length;
  const partsIn = (state: SectionState) => rows.reduce((sum, row) => sum + row.parts.filter(part => shown(part) === state).length, 0);
  const [visible, soon, hidden, soonParts, hiddenParts] = [count("visibile"), count("in-arrivo"), count("nascosta"), partsIn("in-arrivo"), partsIn("nascosta")];

  /** Optimistic change of a section (part undefined) or of one of its parts, put back if saving fails. */
  function change(section: string, title: string, state: SectionState, part?: string) {
    const before = part ? rows.find(item => item.key === section)?.parts.find(p => p.id === part)?.state : rows.find(item => item.key === section)?.state;
    const apply = (value: SectionState) => setRows(list => list.map(item => item.key !== section ? item : part
      ? { ...item, parts: item.parts.map(p => (p.id === part ? { ...p, state: value } : p)) }
      : { ...item, state: value }));
    setBusy(part ?? section);
    apply(state);
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof setSectionStateAction>>;
      try {
        result = part ? await setPartStateAction(part, state) : await setSectionStateAction(section, state);
      } catch {
        result = { ok: false, error: "Sessione scaduta: accedi di nuovo." };
      }
      if (result.ok) {
        setToast({ text: `${title} ora è ${SAID[state]}`, at: Date.now() });
      } else {
        if (before) apply(before);
        setToast({ text: result.error, error: true, at: Date.now() });
      }
      setBusy(null);
    });
  }

  return (
    <>
      <h1 className="font-serif text-[32px] font-bold leading-tight text-[#7A1F2B]">Sezioni</h1>
      <p className="-mt-2 font-serif text-[18px] text-[#5E4E3E]">Cosa vedono gli utenti</p>
      <p className="text-[15px] leading-6 text-[#5E4E3E]">Per ogni sezione, in entrambe le edizioni: <b className="text-[#1F6B45]">Visibile</b>, <b className="text-[#7A4E00]">In arrivo</b> (resta nei menu, attenuata, e apre la pagina «in costruzione») o <b className="text-[#2B2118]">Nascosta</b>. L’effetto è immediato e non cancella niente.</p>
      <p className="flex flex-wrap gap-2" aria-live="polite">
        <span className="rounded-[14px] bg-[#E3EEDF] px-3 py-1 text-[13px] font-bold text-[#2E6B3F]">{visible} {visible === 1 ? "visibile" : "visibili"}</span>
        <span className="rounded-[14px] bg-[#F7E7BE] px-3 py-1 text-[13px] font-bold text-[#2B2118]">{soon} in arrivo</span>
        <span className="rounded-[14px] bg-[#E4E0DB] px-3 py-1 text-[13px] font-bold text-[#4A4038]">{hidden} {hidden === 1 ? "nascosta" : "nascoste"}</span>
        {soonParts > 0 && <span className="rounded-[14px] border border-[#E0A21A] px-3 py-1 text-[13px] font-bold text-[#2B2118]">{soonParts} {soonParts === 1 ? "parte in arrivo" : "parti in arrivo"}</span>}
        {hiddenParts > 0 && <span className="rounded-[14px] border border-[#2B2118] px-3 py-1 text-[13px] font-bold text-[#2B2118]">{hiddenParts} {hiddenParts === 1 ? "parte nascosta" : "parti nascoste"}</span>}
      </p>
      <ul aria-label="Sezioni" className="overflow-hidden rounded-[16px] border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0]">
        {rows.map(row => {
          const expanded = open.includes(row.key);
          const changedParts = row.parts.filter(part => shown(part) !== "visibile" && part.group !== "edizioni");
          const groups = (Object.keys(PART_GROUPS) as PartGroup[]).filter(group => group !== "edizioni" && row.parts.some(part => part.group === group));
          const editionParts = row.parts.some(part => part.group === "edizioni");
          const changedEditions = row.parts.filter(part => part.group === "edizioni" && shown(part) !== "visibile");
          return (
            <li key={row.key} data-section-row={row.key} className="border-t border-[#DDCFAE]/70 first:border-t-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-[19px] font-bold leading-tight">{row.title}</p>
                  <p className="mt-0.5 text-[13px] leading-5 text-[#5E4E3E]">{row.where} · <State state={row.state} /></p>
                </div>
                <StateSelector title={row.title} state={row.state} disabled={pending && busy === row.key} onChange={state => change(row.key, row.title, state)} />
              </div>
              {row.parts.length > 0 && (
                <>
                  <button type="button" aria-expanded={expanded} aria-controls={`parti-${row.key}`} onClick={() => setOpen(list => (expanded ? list.filter(key => key !== row.key) : [...list, row.key]))}
                    className="flex min-h-11 w-full items-center gap-1 border-t border-[#DDCFAE]/70 px-3.5 text-left text-[14px]" data-parts-summary="">
                    {changedParts.length > 0
                      ? <span className="min-w-0 flex-1 text-[#2B2118]"><b>{changedParts.length} {changedParts.length === 1 ? "parte non visibile" : "parti non visibili"}:</b> {changedParts.map(part => part.title).join(", ")}{changedEditions.length > 0 ? ` · edizione ${changedEditions.map(part => part.title).join(", ")}` : ""}</span>
                      : <span className="min-w-0 flex-1 text-[#5E4E3E]">{row.parts.length} parti{changedEditions.length > 0 ? ` · edizione ${changedEditions.map(part => part.title).join(", ")} non visibile` : " · tutte visibili"}</span>}
                    <span className="shrink-0 font-bold text-[#7A1F2B]">· Gestisci</span>
                    <ChevronRight size={18} aria-hidden="true" className={`shrink-0 text-[#7A1F2B] transition-transform ${expanded ? "rotate-90" : ""}`} />
                  </button>
                  {expanded && (
                    <div id={`parti-${row.key}`} className="border-t border-[#DDCFAE]/70 bg-[#F6EFDF]/60 pb-2 pl-5 pr-3.5">
                      {groups.map(group => <PartList key={group} row={row} group={group} pending={pending} busy={busy} change={change} />)}
                      {editionParts && (
                        <details className="mt-2" data-advanced="" open={advanced.includes(row.key)}
                          onToggle={event => { const isOpen = event.currentTarget.open; setAdvanced(current => isOpen ? [...new Set([...current, row.key])] : current.filter(key => key !== row.key)); }}>
                          <summary className="flex min-h-11 cursor-pointer items-center text-[14px] font-bold text-[#7A1F2B]">Avanzate: scelta diversa per 2014 e 2024</summary>
                          <PartList row={row} group="edizioni" pending={pending} busy={busy} change={change} />
                        </details>
                      )}
                    </div>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-[14px] leading-6 text-[#5E4E3E]">Le singole schede si nascondono dall’interruttore nella loro lista.</p>
      <p className="text-[13px] leading-5 text-[#5E4E3E]">Ogni cambio finisce nel Registro. Le sezioni nascoste o in arrivo restano visibili a te, con la loro etichetta.</p>
      {toast && (
        <div role="status" key={toast.at} className="fixed inset-x-0 bottom-[calc(16px+env(safe-area-inset-bottom,0px))] z-50 mx-auto w-[calc(100%-32px)] max-w-md rounded-[12px] bg-[#2B2118] px-4 py-3 text-center text-[15px] font-semibold text-[#FFFBF0] shadow-lg">
          {toast.text}
        </div>
      )}
    </>
  );
}
