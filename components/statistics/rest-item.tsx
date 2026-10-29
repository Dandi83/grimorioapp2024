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
export function RestItem({ id, title, children }: { id: string; title: string; children: ReactNode }) {
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
    <details ref={details} id={id} onToggle={remember} className="group scroll-mt-4 border-t border-[#DDCFAE] first:border-t-0" data-rest-item={id}>
      <summary className="flex min-h-[54px] cursor-pointer list-none items-center justify-between gap-3 px-4 text-[16px] font-semibold text-[#2B2118] [&::-webkit-details-marker]:hidden">
        {title}
        <span aria-hidden="true" className="text-[22px] leading-none text-[#7A1F2B] transition-transform group-open:rotate-90">›</span>
      </summary>
      {/* The charts keep the size they have on a phone: on a wide screen they would grow, text included. */}
      <div className="max-w-xl px-4 pb-4">{children}</div>
    </details>
  );
}
