"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The description at the top of a sheet of «I mostri creati da voi» (PROMPT 20): on the phone the first 4 lines, with
 * «Leggi tutto» only when the text is longer; opened for this visit only (nothing saved). Wide screens show it whole.
 */
export function DescriptionLead({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(false);
  useEffect(() => {
    const node = box.current;
    if (!node || open) return;
    const measure = () => setLong(node.scrollHeight > node.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [open]);
  return (
    <div className="mx-6 mt-[14px]" data-monster-lead="">
      <div ref={box} id="descrizione-scheda" data-lead-open={open ? "true" : "false"}
        className={`font-serif text-[19px] italic leading-[1.5] text-[#3D3128] ${open ? "" : "max-lg:max-h-[6em] max-lg:overflow-hidden"}`}>
        {children}
      </div>
      {long && !open && (
        <button type="button" onClick={() => setOpen(true)} aria-expanded={false} aria-controls="descrizione-scheda" data-lead-more=""
          className="mt-1 min-h-11 text-[16px] font-bold not-italic text-primary underline-offset-4 hover:underline lg:hidden">
          Leggi tutto
        </button>
      )}
    </div>
  );
}
