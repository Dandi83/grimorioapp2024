"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

import { useUserEdition } from "@/components/edition/edition-provider";
import { EDITION_COLOR, EditionChoice } from "@/components/edition/edition-choice";
import { EDITIONS } from "@/lib/public-sections";

/** Tab and Shift+Tab stay inside a dialog. */
export function trapFocus(event: ReactKeyboardEvent<HTMLElement>) {
  if (event.key !== "Tab") return;
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]")];
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

/**
 * «La tua edizione»: handle, title, the two large choices (the active one full with the tick), the
 * status line read by screen readers and «Fatto». A choice applies at once to the whole app.
 */
function EditionPanel({ sheet, keyboard, onClose, pill }: { sheet: boolean; keyboard: boolean; onClose: () => void; pill: RefObject<HTMLButtonElement | null> }) {
  const { edition, choose } = useUserEdition();
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const active = useRef<HTMLButtonElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);

  useEffect(() => {
    // The focus ring only for those who opened it with the keyboard (a tap shows no ring, also on iPhone).
    const options = { focusVisible: keyboard } as FocusOptions;
    active.current?.focus(options);
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") close.current(); };
    // The small box of the computer closes with a click anywhere else (the sheet has its veil).
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !pill.current?.contains(target)) close.current();
    };
    window.addEventListener("keydown", escape);
    if (!sheet) document.addEventListener("pointerdown", outside);
    if (sheet) document.body.style.overflow = "hidden";
    const button = pill.current;
    return () => {
      window.removeEventListener("keydown", escape);
      document.removeEventListener("pointerdown", outside);
      if (sheet) document.body.style.overflow = "";
      button?.focus(options);
    };
  }, [sheet, keyboard, pill]);

  const body = (
    <div
      ref={panel}
      role="dialog"
      aria-modal={sheet}
      aria-labelledby={titleId}
      onKeyDown={trapFocus}
      className={sheet
        ? "relative w-full max-w-[560px] rounded-t-[24px] bg-background px-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] pt-2.5 shadow-[0_-8px_30px_rgb(43_33_24_/_25%)]"
        : "absolute left-0 top-[calc(100%+8px)] z-50 w-[400px] rounded-[18px] border border-border bg-background p-4 shadow-[0_12px_32px_rgb(43_33_24_/_25%)]"}
    >
      {sheet && <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-border" />}
      <h2 id={titleId} className="font-serif text-[26px] font-bold leading-tight text-foreground">La tua edizione</h2>
      <p className="mt-1 text-[15px] leading-snug text-muted">Vale per tutta l’app: incantesimi, bestiario, classi, regole e ricerca.</p>
      <div className="mt-4 flex flex-col gap-3">
        {EDITIONS.map(value => (
          <EditionChoice key={value} ref={value === edition ? active : undefined} edition={value} active={value === edition} compact={!sheet} onChoose={choose} />
        ))}
      </div>
      <p role="status" aria-live="polite" className="mt-3 text-center text-[15px] font-semibold text-foreground">Ora tutta l’app parte dal {edition}.</p>
      <button type="button" onClick={onClose}
        className="mt-3 min-h-12 w-full rounded-[14px] bg-foreground text-[17px] font-bold text-card focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-amber">
        Fatto
      </button>
    </div>
  );

  if (!sheet) return body;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <div aria-hidden="true" className="absolute inset-0 bg-[rgb(43_33_24_/_45%)]" onClick={onClose} />
      {body}
    </div>,
    document.body,
  );
}

/**
 * Pill «Edizione 2024 ⌄» (bordeaux; «Edizione 2014 ⌄» blue): opens the panel of «la tua edizione».
 * place: "home" on the picture of the Home (phones and tablets), opening a sheet from the bottom;
 * "side" under the logo of the computer column, opening a small box under the pill.
 * Shown once the device is read; with a single edition offered to the public it does not open.
 */
export function EditionPill({ place, className = "" }: { place: "home" | "side"; className?: string }) {
  const { edition, ready, forced } = useUserEdition();
  const [open, setOpen] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const pill = useRef<HTMLButtonElement>(null);
  const look = `inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[15px] font-bold text-white shadow-[0_2px_8px_rgb(43_33_24_/_28%)] ${ready ? "" : "invisible"}`;
  if (forced) {
    return <span className={`${look} ${className}`} style={{ backgroundColor: EDITION_COLOR[edition] }}>Edizione {edition}</span>;
  }
  return (
    <div className={`relative ${className}`}>
      <button ref={pill} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={event => { setKeyboard(event.detail === 0); setOpen(value => !value); }}
        aria-label={`Edizione ${edition}: cambia la tua edizione`}
        className={`${look} focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-amber`}
        style={{ backgroundColor: EDITION_COLOR[edition] }}>
        Edizione {edition}
        <ChevronDown size={18} strokeWidth={2.6} aria-hidden="true" />
      </button>
      {open && <EditionPanel sheet={place === "home"} keyboard={keyboard} pill={pill} onClose={() => setOpen(false)} />}
    </div>
  );
}
