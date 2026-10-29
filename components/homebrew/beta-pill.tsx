"use client";

import { useEffect, useId, useRef, useState } from "react";

const NOTE = "Sezione nuova: può cambiare. Se qualcosa non va, scrivici da Info → Segnala un problema.";

/**
 * «Beta» next to the title of «I mostri creati da voi» (PROMPT 15): on the dark card of the Bestiario (amber) and on the
 * light pages (brown on cream). A tap (phone) or the mouse shows a small note; a tap outside closes it.
 * narrow: a narrower note, inside the list column of the computer (320 px). row: the note as wide as the
 * nearest positioned box, the row «Creature originali» (PROMPT 25), never out of the screen or of the list column.
 */
export function BetaPill({ tone = "light", narrow = false, row = false }: { tone?: "dark" | "light"; narrow?: boolean; row?: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const box = useRef<HTMLSpanElement>(null);
  const mouse = useRef(false);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!box.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  const colors = tone === "dark" ? "border-[#E0A21A] bg-transparent text-[#E0A21A]" : "border-[#7A4E00] bg-[#FCEFD0] text-[#7A4E00]";
  return (
    // The mouse opens it on hover (a click keeps it open); a tap opens and closes it.
    <span ref={box} className={`${row ? "" : "relative "}inline-flex align-baseline`}
      onPointerEnter={event => { if (event.pointerType === "mouse") setOpen(true); }}
      onPointerLeave={event => { if (event.pointerType === "mouse") setOpen(false); }}>
      <button type="button" aria-describedby={id} aria-expanded={open} data-beta-pill={tone}
        onPointerDown={event => { mouse.current = event.pointerType === "mouse"; }}
        onClick={() => setOpen(value => (mouse.current ? true : !value))}
        className={`inline-flex items-center rounded-full border px-[7px] py-px font-sans text-[11px] font-bold leading-4 tracking-[0.08em] ${colors}`}>
        Beta
      </button>
      <span id={id} role="tooltip" hidden={!open} data-beta-note=""
        className={`absolute top-full z-30 mt-1.5 ${row ? "left-0 right-0" : `right-0 ${narrow ? "w-[220px]" : "w-[min(260px,calc(100vw-48px))]"}`} rounded-[10px] bg-[#2B2118] px-3 py-2 font-sans text-[13px] font-normal normal-case leading-5 tracking-normal text-[#FFFBF0] shadow-lg`}>
        {NOTE}
      </span>
    </span>
  );
}
