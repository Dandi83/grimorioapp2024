"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

import { useEditions } from "@/components/sections/parts-context";
import { HiddenTag } from "@/components/sections/hidden-tag";
import { usePageEdition, useRegisterPageEdition, useUserEdition, type PageEdition } from "@/components/edition/edition-provider";
import { EDITION_COLOR, EditionChoice } from "@/components/edition/edition-choice";
import { EDITIONS, partId, type Edition } from "@/lib/public-sections";

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
 * «Scegli l’edizione»: handle, title and the two large choices «D&D 2024» · «D&D 2014» (the active one full).
 * A tap applies the choice to the whole app and closes the panel (EditionProvider announces it to screen
 * readers); a tap outside, Esc or the handle dragged down close it without changing anything.
 * page: a section page showing another edition than the user's (an address with an edition) says so
 * under the title, and a choice also brings the page to it.
 */
function EditionPanel({ sheet, keyboard, onClose, pill, page }: { sheet: boolean; keyboard: boolean; onClose: () => void; pill: RefObject<HTMLButtonElement | null>; page?: PageEdition }) {
  const { edition: userEdition, choose: chooseUserEdition } = useUserEdition();
  const shown = page?.shown ?? userEdition;
  const choose = page?.choose ?? chooseUserEdition;
  const editions = page?.editions ?? EDITIONS.map(value => ({ value, hidden: false }));
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const active = useRef<HTMLButtonElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  // The handle of the sheet: dragged down more than 80 px, the panel closes; less, it goes back.
  const [drag, setDrag] = useState(0);
  const dragFrom = useRef<number | null>(null);

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
      style={drag ? { transform: `translateY(${drag}px)` } : undefined}
    >
      {sheet && (
        <div aria-hidden="true" className="-mx-5 -mt-2.5 flex cursor-grab touch-none justify-center pb-3 pt-2.5"
          onPointerDown={event => { dragFrom.current = event.clientY; event.currentTarget.setPointerCapture?.(event.pointerId); }}
          onPointerMove={event => { if (dragFrom.current !== null) setDrag(Math.max(0, event.clientY - dragFrom.current)); }}
          onPointerUp={() => { dragFrom.current = null; if (drag > 80) onClose(); else setDrag(0); }}
          onPointerCancel={() => { dragFrom.current = null; setDrag(0); }}>
          <div className="h-1.5 w-11 rounded-full bg-border" />
        </div>
      )}
      <h2 id={titleId} className="font-serif text-[26px] font-bold leading-tight text-foreground">Scegli l’edizione</h2>
      {shown !== userEdition && (
        <p data-testid="page-edition-note" className="mt-1 text-[14px] leading-snug text-muted">
          Questa pagina mostra il {shown}. La tua edizione è il {userEdition}.
        </p>
      )}
      <div className="mt-4 flex flex-col gap-3">
        {editions.map(({ value, hidden }) => (
          <div key={value} data-part={page ? partId(page.section, value) : undefined} className="relative">
            <EditionChoice ref={value === shown ? active : undefined} edition={value} active={value === shown}
              onChoose={chosen => { choose(chosen); onClose(); }} />
            {hidden && <HiddenTag className="absolute right-3 top-2" />}
          </div>
        ))}
      </div>
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
 * The pill itself and its panel: «Edizione 2024 ⌄» bordeaux, «Edizione 2014 ⌄» blue, at least 44 px high.
 * large: the pill centred on the picture of the Home, 52 px high, 18 px text, arrow 20 px, a deeper shadow.
 */
function Pill({ shown, page, sheet, compact, large, className }: { shown: Edition; page?: PageEdition; sheet: boolean; compact?: boolean; large?: boolean; className: string }) {
  const { ready, forced } = useUserEdition();
  const [open, setOpen] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const pill = useRef<HTMLButtonElement>(null);
  const size = large
    ? "min-h-[52px] gap-2 px-6 text-[18px] shadow-[0_4px_14px_rgb(43_33_24_/_38%)]"
    : "min-h-11 gap-1.5 px-4 text-[15px] shadow-[0_2px_8px_rgb(43_33_24_/_28%)]";
  const look = `inline-flex shrink-0 items-center whitespace-nowrap rounded-full font-bold text-white ${size} ${ready ? "" : "invisible"}`;
  // On a narrow phone the pill of a page says only «2024 ⌄», so the title keeps its line.
  const label = <>{compact ? <span className="max-[419px]:hidden">Edizione </span> : "Edizione "}{shown}</>;
  if (forced) {
    return <span className={`${look} ${className}`} style={{ backgroundColor: EDITION_COLOR[shown] }}>{label}</span>;
  }
  return (
    <div className={`relative ${className}`}>
      <button ref={pill} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={event => { setKeyboard(event.detail === 0); setOpen(value => !value); }}
        aria-label={`Edizione ${shown}: cambia la tua edizione`}
        className={`${look} focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-amber`}
        style={{ backgroundColor: EDITION_COLOR[shown] }}>
        {label}
        <ChevronDown size={large ? 20 : 18} strokeWidth={2.6} aria-hidden="true" />
      </button>
      {open && <EditionPanel sheet={sheet} keyboard={keyboard} pill={pill} page={page} onClose={() => setOpen(false)} />}
    </div>
  );
}

/**
 * Pill «Edizione 2024 ⌄» of «la tua edizione».
 * place: "home" on the picture of the Home (phones and tablets), opening a sheet from the bottom;
 * "side" under the logo of the computer column, opening a small box under the pill. On a section page
 * the column pill shows the edition of the page (an address can set it) and chooses through the page.
 * Shown once the device is read; with a single edition offered to the public it does not open.
 */
export function EditionPill({ place, size, className = "" }: { place: "home" | "side"; size?: "large"; className?: string }) {
  const { edition } = useUserEdition();
  const page = usePageEdition();
  const own = place === "side" ? page : undefined;
  return <Pill shown={own?.shown ?? edition} page={own} sheet={place === "home"} large={size === "large"} className={className} />;
}

/**
 * The pill at the top right of a section page, aligned with its title, in place of the old 2024 · 2014
 * buttons (phones and tablets; on computers the column pill does the same). edition: the edition the page
 * shows; choose: the page's own choice (it changes «la tua edizione» and brings the page to it).
 * None when the section offers a single edition.
 */
export function SectionEditionPill({ section, edition, choose, className = "" }: { section: string; edition: Edition; choose: (value: Edition) => void; className?: string }) {
  const { editions, selector } = useEditions(section);
  const page = selector ? { section, shown: edition, editions, choose } : undefined;
  useRegisterPageEdition(page);
  if (!page) return null;
  return <Pill shown={edition} page={page} sheet compact className={`lg:hidden ${className}`} />;
}
