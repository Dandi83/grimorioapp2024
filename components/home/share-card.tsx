"use client";

import { useEffect, useState } from "react";

import { shareApp } from "@/lib/share-app";
import { ShareIcon } from "@/components/home/faces";

/**
 * «Porta il Grimorio al tavolo» (canvas «Valutazione Il Grimorio.App», ④ L1): always in the Home, in the page flow.
 * The whole card is one button: the phone's share menu, or the link copied and «Link copiato» for 2 seconds.
 */
export function ShareCard() {
  const [note, setNote] = useState("");
  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote(""), 2000);
    return () => clearTimeout(timer);
  }, [note]);

  async function share() {
    const result = await shareApp("home");
    if (result === "copied") setNote("Link copiato");
    else if (result === "failed") setNote("Copia non riuscita");
  }

  return (
    <div className="relative" data-share-card="">
      <button type="button" onClick={() => void share()} aria-label="Condividi il Grimorio"
        className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[18px] border border-[#DDCFAE] bg-[#FFFBF0] p-3 text-left focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#E0A21A] active:bg-[#F6EFDF]">
        <img src="/icon-192.png" alt="" width={56} height={56} className="size-14 rounded-[14px] shadow-[0_2px_6px_rgb(43_33_24_/_25%)]" />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="font-serif text-[20px] font-semibold leading-[1.15] text-[#2B2118]">Porta il Grimorio al tavolo</span>
          <span className="text-[13px] text-[#5E4E3E]">Mandalo al tuo gruppo, è gratis</span>
        </span>
        <span aria-hidden="true" className="flex size-[52px] items-center justify-center rounded-full bg-[#7A1F2B]">
          <ShareIcon size={22} />
        </span>
      </button>
      <p role="status" aria-live="polite"
        className={note ? "absolute inset-x-0 -top-10 mx-auto w-max rounded-full bg-[#2B2118] px-4 py-1.5 text-[14px] font-semibold text-[#FFFBF0] shadow-lg" : "sr-only"}>
        {note}
      </p>
    </div>
  );
}
