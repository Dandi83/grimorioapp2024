"use client";

import { useEffect, useState, useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";

import { setSectionVisibilityAction } from "@/app/actions/admin-sections";

interface Row { key: string; title: string; where: string; hidden: boolean }

/** «Sezioni dell'app»: one row per public section with the eye that shows or hides it. */
export function SectionSwitches({ sections }: { sections: Row[] }) {
  const [rows, setRows] = useState(sections);
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

  function flip(row: Row) {
    const hidden = !row.hidden;
    setBusy(row.key);
    setRows(list => list.map(item => (item.key === row.key ? { ...item, hidden } : item)));
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof setSectionVisibilityAction>>;
      try {
        result = await setSectionVisibilityAction(row.key, hidden);
      } catch {
        result = { ok: false, error: "Sessione scaduta: accedi di nuovo." };
      }
      if (result.ok) {
        setToast({ text: `${row.title} ora è ${hidden ? "nascosta" : "visibile"}`, at: Date.now() });
      } else {
        setRows(list => list.map(item => (item.key === row.key ? { ...item, hidden: row.hidden } : item)));
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
      </p>
      <ul aria-label="Sezioni" className="overflow-hidden rounded-[14px] border-[1.5px] border-border bg-card">
        {rows.map(row => (
          <li key={row.key} className="flex items-center gap-3 border-t border-elevated px-3.5 py-2.5 first:border-t-0">
            <div className="min-w-0 flex-1">
              <p className="font-serif text-[19px] font-bold leading-tight">{row.title}</p>
              <p className="mt-0.5 text-[13px] leading-5 text-muted">
                {row.where} · {row.hidden
                  ? <b className="font-bold text-[#A2462E]">Nascosta</b>
                  : <b className="font-bold text-[#2E6B3F]">Visibile</b>}
              </p>
            </div>
            <button
              type="button"
              onClick={() => flip(row)}
              disabled={pending && busy === row.key}
              aria-pressed={!row.hidden}
              aria-label={`${row.hidden ? "Mostra" : "Nascondi"} ${row.title}`}
              className={`grid h-11 w-[52px] shrink-0 place-items-center rounded-[12px] border-2 ${row.hidden ? "border-[#EDE3CC] bg-[#EDE3CC] text-muted" : "border-primary bg-card text-primary"}`}
            >
              {row.hidden ? <EyeOff size={22} aria-hidden="true" /> : <Eye size={22} aria-hidden="true" />}
            </button>
          </li>
        ))}
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
