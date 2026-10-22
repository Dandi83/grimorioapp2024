"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronRight, Eye, EyeOff } from "lucide-react";

import { setPartVisibilityAction, setSectionVisibilityAction } from "@/app/actions/admin-sections";
import { PART_GROUPS, type PartGroup } from "@/lib/public-sections";

interface PartRow { id: string; title: string; group: PartGroup; hidden: boolean }
interface Row { key: string; title: string; where: string; hidden: boolean; parts: PartRow[] }

/** The eye that shows or hides a section or a part: 52×44, open with a bordeaux border, crossed out on #EDE3CC. */
function EyeButton({ title, hidden, disabled, onClick }: { title: string; hidden: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={!hidden}
      aria-label={`${hidden ? "Mostra" : "Nascondi"} ${title}`}
      className={`grid h-11 w-[52px] shrink-0 place-items-center rounded-[12px] border-2 ${hidden ? "border-[#EDE3CC] bg-[#EDE3CC] text-muted" : "border-primary bg-card text-primary"}`}
    >
      {hidden ? <EyeOff size={22} aria-hidden="true" /> : <Eye size={22} aria-hidden="true" />}
    </button>
  );
}

const State = ({ hidden }: { hidden: boolean }) => (hidden
  ? <b className="font-bold text-[#A2462E]">Nascosta</b>
  : <b className="font-bold text-[#2E6B3F]">Visibile</b>);

/**
 * «Sezioni dell'app»: one row per public section with the eye that shows or hides it, and under the
 * sections that have parts (editions, collections, tabs, blocks) the row «N parti ›» that opens them.
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

  const visible = rows.filter(row => !row.hidden).length;
  const hiddenCount = rows.length - visible;
  const hiddenParts = rows.reduce((sum, row) => sum + row.parts.filter(part => part.hidden).length, 0);

  /** Optimistic switch of a section (part undefined) or of one of its parts, put back if saving fails. */
  function flip(section: string, title: string, hidden: boolean, part?: string) {
    const apply = (value: boolean) => setRows(list => list.map(item => item.key !== section ? item : part
      ? { ...item, parts: item.parts.map(p => (p.id === part ? { ...p, hidden: value } : p)) }
      : { ...item, hidden: value }));
    setBusy(part ?? section);
    apply(hidden);
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof setSectionVisibilityAction>>;
      try {
        result = part ? await setPartVisibilityAction(part, hidden) : await setSectionVisibilityAction(section, hidden);
      } catch {
        result = { ok: false, error: "Sessione scaduta: accedi di nuovo." };
      }
      if (result.ok) {
        setToast({ text: `${title} ora è ${hidden ? "nascosta" : "visibile"}`, at: Date.now() });
      } else {
        apply(!hidden);
        setToast({ text: result.error, error: true, at: Date.now() });
      }
      setBusy(null);
    });
  }

  return (
    <>
      <h1 className="font-serif text-[30px] font-bold leading-tight text-primary">Sezioni dell’app</h1>
      <p className="text-[15px] leading-6 text-muted">Tocca l’occhio per mostrare o nascondere una sezione al pubblico. L’effetto è immediato e non cancella niente.</p>
      <p className="flex flex-wrap gap-2" aria-live="polite">
        <span className="rounded-[14px] bg-[#E3EEDF] px-3 py-1 text-[13px] font-bold text-[#2E6B3F]">{visible} {visible === 1 ? "visibile" : "visibili"}</span>
        <span className="rounded-[14px] bg-[#F3DED6] px-3 py-1 text-[13px] font-bold text-[#A2462E]">{hiddenCount} {hiddenCount === 1 ? "nascosta" : "nascoste"}</span>
        {hiddenParts > 0 && <span className="rounded-[14px] border border-[#2B2118] px-3 py-1 text-[13px] font-bold text-[#2B2118]">{hiddenParts} {hiddenParts === 1 ? "parte nascosta" : "parti nascoste"}</span>}
      </p>
      <ul aria-label="Sezioni" className="overflow-hidden rounded-[14px] border-[1.5px] border-border bg-card">
        {rows.map(row => {
          const expanded = open.includes(row.key);
          return (
            <li key={row.key} className="border-t border-elevated first:border-t-0">
              <div className="flex items-center gap-3 px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-[19px] font-bold leading-tight">{row.title}</p>
                  <p className="mt-0.5 text-[13px] leading-5 text-muted">{row.where} · <State hidden={row.hidden} /></p>
                </div>
                <EyeButton title={row.title} hidden={row.hidden} disabled={pending && busy === row.key} onClick={() => flip(row.key, row.title, !row.hidden)} />
              </div>
              {row.parts.length > 0 && (
                <>
                  <button type="button" aria-expanded={expanded} aria-controls={`parti-${row.key}`} onClick={() => setOpen(list => (expanded ? list.filter(key => key !== row.key) : [...list, row.key]))}
                    className="flex min-h-11 w-full items-center gap-1 border-t border-elevated px-3.5 text-left text-[14px] font-semibold text-primary">
                    {row.parts.length} parti
                    {row.parts.some(part => part.hidden) && <span className="ml-1 font-normal text-muted">· {row.parts.filter(part => part.hidden).length} nascoste</span>}
                    <ChevronRight size={18} aria-hidden="true" className={`ml-auto shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
                  </button>
                  {expanded && (
                    <div id={`parti-${row.key}`} className="border-t border-elevated bg-background/60 pb-1 pl-5 pr-3.5">
                      {(Object.keys(PART_GROUPS) as PartGroup[]).filter(group => row.parts.some(part => part.group === group)).map(group => (
                        <section key={group} aria-label={`${PART_GROUPS[group]} · ${row.title}`}>
                          <h3 className="pt-2.5 text-[12px] font-bold uppercase tracking-[0.08em] text-muted">{PART_GROUPS[group]}</h3>
                          <ul aria-label={`Parti di ${row.title}: ${PART_GROUPS[group]}`}>
                            {row.parts.filter(part => part.group === group).map(part => (
                              <li key={part.id} className="flex items-center gap-3 border-l-2 border-divider py-1.5 pl-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-[15px] font-semibold leading-snug">{part.title}</p>
                                  <p className="text-[13px] leading-5"><State hidden={part.hidden} /></p>
                                </div>
                                <EyeButton title={part.title} hidden={part.hidden} disabled={pending && busy === part.id} onClick={() => flip(row.key, part.title, !part.hidden, part.id)} />
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
      <p className="text-[13px] leading-5 text-muted">Ogni cambio finisce nel Registro modifiche. Le sezioni nascoste restano visibili a te, con l’etichetta «Nascosta».</p>
      {toast && (
        <div role="status" key={toast.at} className="fixed inset-x-0 bottom-[calc(16px+env(safe-area-inset-bottom,0px))] z-50 mx-auto w-[calc(100%-32px)] max-w-md rounded-[12px] bg-[#2B2118] px-4 py-3 text-center text-[15px] font-semibold text-[#FFFBF0] shadow-lg">
          {toast.text}
        </div>
      )}
    </>
  );
}
