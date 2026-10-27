"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronRight } from "lucide-react";

import { setPartStateAction, setSectionStateAction } from "@/app/actions/admin-sections";
import { PART_GROUPS, type PartGroup } from "@/lib/public-sections";
import type { SectionState } from "@/lib/section-visibility";

interface PartRow { id: string; title: string; group: PartGroup; state: SectionState }
interface Row { key: string; title: string; where: string; state: SectionState; parts: PartRow[] }

const OPTIONS: { value: SectionState; label: string; active: string }[] = [
  { value: "visibile", label: "Visibile", active: "bg-[#2E6B3F] text-white" },
  { value: "in-arrivo", label: "In arrivo", active: "bg-[#E0A21A] text-[#2B2118]" },
  { value: "nascosta", label: "Nascosta", active: "bg-[#4A4038] text-white" },
];
const SAID: Record<SectionState, string> = { visibile: "visibile", "in-arrivo": "in arrivo", nascosta: "nascosta" };

/** «Visibile · In arrivo · Nascosta» of a section or part: green, amber, dark grey when chosen. */
function StateSelector({ title, state, disabled, onChange }: { title: string; state: SectionState; disabled: boolean; onChange: (state: SectionState) => void }) {
  return (
    <div role="radiogroup" aria-label={`Stato di ${title}`} className="flex shrink-0 overflow-hidden rounded-[12px] border-[1.5px] border-border bg-card text-[13px] font-bold">
      {OPTIONS.map(option => (
        <button key={option.value} type="button" role="radio" aria-checked={state === option.value} disabled={disabled}
          onClick={() => { if (state !== option.value) onChange(option.value); }}
          className={`min-h-11 px-2.5 transition-colors sm:px-3 ${state === option.value ? option.active : "text-muted hover:bg-elevated"}`}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

const State = ({ state }: { state: SectionState }) => (state === "nascosta"
  ? <b className="font-bold text-[#4A4038]">Nascosta</b>
  : state === "in-arrivo" ? <b className="font-bold text-[#9A6A00]">In arrivo</b>
    : <b className="font-bold text-[#2E6B3F]">Visibile</b>);

/**
 * «Sezioni dell'app»: one row per public section with its three states, and under the sections that have parts
 * (editions, collections, tabs, blocks) the row «N parti ›» that opens them, each with the same three states.
 */
export function SectionSwitches({ sections }: { sections: Row[] }) {
  const [rows, setRows] = useState(sections);
  const [open, setOpen] = useState<string[]>([]);
  const [toast, setToast] = useState<{ text: string; error?: boolean; at: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const count = (state: SectionState) => rows.filter(row => row.state === state).length;
  const partsIn = (state: SectionState) => rows.reduce((sum, row) => sum + row.parts.filter(part => part.state === state).length, 0);
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
      <h1 className="font-serif text-[30px] font-bold leading-tight text-primary">Sezioni dell’app</h1>
      <p className="text-[15px] leading-6 text-muted">Scegli per ogni sezione e parte: <b>Visibile</b>, <b>In arrivo</b> (resta nei menu, attenuata, e apre la pagina «in costruzione») o <b>Nascosta</b>. L’effetto è immediato e non cancella niente.</p>
      <p className="flex flex-wrap gap-2" aria-live="polite">
        <span className="rounded-[14px] bg-[#E3EEDF] px-3 py-1 text-[13px] font-bold text-[#2E6B3F]">{visible} {visible === 1 ? "visibile" : "visibili"}</span>
        <span className="rounded-[14px] bg-[#F7E7BE] px-3 py-1 text-[13px] font-bold text-[#2B2118]">{soon} in arrivo</span>
        <span className="rounded-[14px] bg-[#E4E0DB] px-3 py-1 text-[13px] font-bold text-[#4A4038]">{hidden} {hidden === 1 ? "nascosta" : "nascoste"}</span>
        {soonParts > 0 && <span className="rounded-[14px] border border-[#E0A21A] px-3 py-1 text-[13px] font-bold text-[#2B2118]">{soonParts} {soonParts === 1 ? "parte in arrivo" : "parti in arrivo"}</span>}
        {hiddenParts > 0 && <span className="rounded-[14px] border border-[#2B2118] px-3 py-1 text-[13px] font-bold text-[#2B2118]">{hiddenParts} {hiddenParts === 1 ? "parte nascosta" : "parti nascoste"}</span>}
      </p>
      <ul aria-label="Sezioni" className="overflow-hidden rounded-[14px] border-[1.5px] border-border bg-card">
        {rows.map(row => {
          const expanded = open.includes(row.key);
          const changedParts = row.parts.filter(part => part.state !== "visibile");
          return (
            <li key={row.key} data-section-row={row.key} className="border-t border-elevated first:border-t-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-[19px] font-bold leading-tight">{row.title}</p>
                  <p className="mt-0.5 text-[13px] leading-5 text-muted">{row.where} · <State state={row.state} /></p>
                </div>
                <StateSelector title={row.title} state={row.state} disabled={pending && busy === row.key} onChange={state => change(row.key, row.title, state)} />
              </div>
              {row.parts.length > 0 && (
                <>
                  <button type="button" aria-expanded={expanded} aria-controls={`parti-${row.key}`} onClick={() => setOpen(list => (expanded ? list.filter(key => key !== row.key) : [...list, row.key]))}
                    className="flex min-h-11 w-full items-center gap-1 border-t border-elevated px-3.5 text-left text-[14px] font-semibold text-primary">
                    {row.parts.length} parti
                    {changedParts.length > 0 && <span className="ml-1 font-normal text-muted">· {changedParts.length} non visibili</span>}
                    <ChevronRight size={18} aria-hidden="true" className={`ml-auto shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
                  </button>
                  {expanded && (
                    <div id={`parti-${row.key}`} className="border-t border-elevated bg-background/60 pb-1 pl-5 pr-3.5">
                      {(Object.keys(PART_GROUPS) as PartGroup[]).filter(group => row.parts.some(part => part.group === group)).map(group => (
                        <section key={group} aria-label={`${PART_GROUPS[group]} · ${row.title}`}>
                          <h3 className="pt-2.5 text-[12px] font-bold uppercase tracking-[0.08em] text-muted">{PART_GROUPS[group]}</h3>
                          <ul aria-label={`Parti di ${row.title}: ${PART_GROUPS[group]}`}>
                            {row.parts.filter(part => part.group === group).map(part => (
                              <li key={part.id} data-part-row={part.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-l-2 border-divider py-1.5 pl-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-[15px] font-semibold leading-snug">{part.title}</p>
                                  <p className="text-[13px] leading-5"><State state={part.state} /></p>
                                </div>
                                <StateSelector title={part.title} state={part.state} disabled={pending && busy === part.id} onChange={state => change(row.key, part.title, state, part.id)} />
                              </li>
                            ))}
                          </ul>
                        </section>
                      ))}
                    </div>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-[13px] leading-5 text-muted">Ogni cambio finisce nel Registro modifiche. Le sezioni nascoste o in arrivo restano visibili a te, con la loro etichetta.</p>
      {toast && (
        <div role="status" key={toast.at} className="fixed inset-x-0 bottom-[calc(16px+env(safe-area-inset-bottom,0px))] z-50 mx-auto w-[calc(100%-32px)] max-w-md rounded-[12px] bg-[#2B2118] px-4 py-3 text-center text-[15px] font-semibold text-[#FFFBF0] shadow-lg">
          {toast.text}
        </div>
      )}
    </>
  );
}
