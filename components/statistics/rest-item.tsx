"use client";

import { useEffect, useRef, type ReactNode } from "react";

const KEY = "grimorio.statistiche-aperte";

function readOpen(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]") as string[]; } catch { return []; }
}

/**
 * One item of «Il resto» (PROMPT 16): 54 px high, opened and closed with a tap, the arrow › turning. All closed when the
 * page opens; the ones opened stay open on this device (localStorage, never required). An address with its anchor
 * (#salvati, after a filter of «I più salvati») opens its item.
 */
export function RestItem({ id, title, children, card = false }: { id: string; title: string; children: ReactNode; card?: boolean }) {
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (details.current && (readOpen().includes(id) || window.location.hash === `#${id}`)) details.current.open = true;
  }, [id]);
  const remember = () => {
    const open = details.current?.open ?? false;
    try {
      const list = readOpen().filter(item => item !== id);
      localStorage.setItem(KEY, JSON.stringify(open ? [...list, id] : list));
    } catch { /* no storage: nothing remembered */ }
  };
  return (
    // card: the cards of the insight (PROMPT 31), each on its own on the paper, a red title in small capitals.
    <details ref={details} id={id} onToggle={remember} data-rest-item={id}
      className={card ? "group scroll-mt-4 rounded-2xl border border-[#DDCFAE] bg-[#FFFBF0]" : "group scroll-mt-4 border-t border-[#DDCFAE] first:border-t-0"}>
      <summary className={`flex min-h-[54px] cursor-pointer list-none items-center justify-between gap-3 px-4 [&::-webkit-details-marker]:hidden ${card ? "text-[14px] font-bold uppercase tracking-[0.08em] text-[#7A1F2B] [font-variant:small-caps]" : "text-[16px] font-semibold text-[#2B2118]"}`}>
        {title}
        <span aria-hidden="true" className="text-[22px] leading-none text-[#7A1F2B] transition-transform group-open:rotate-90">›</span>
      </summary>
      {/* The charts keep the size they have on a phone: on a wide screen they would grow, text included. */}
      <div className="max-w-xl px-4 pb-4">{children}</div>
    </details>
  );
}
