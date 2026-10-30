"use client";

import { useState } from "react";

/** «Copia»: the fixed link of the Instagram bio, always at hand (PROMPT 31). */
export function CopyLink({ text }: { text: string }) {
  const [done, setDone] = useState<"" | "ok" | "no">("");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone("ok");
    } catch {
      setDone("no");
    }
  };
  return (
    <span className="flex flex-wrap items-center gap-2" data-bio-link="">
      <code className="rounded-lg border border-[#DDCFAE] bg-[#F6EFDF] px-2 py-1 text-[14px] text-[#2B2118]">{text}</code>
      <button type="button" onClick={() => void copy()} className="min-h-11 rounded-full border border-[#7A1F2B] px-4 text-[14px] font-bold text-[#7A1F2B]">Copia</button>
      <span role="status" className="text-[13px] text-[#1F6B45]">{done === "ok" ? "Copiato" : done === "no" ? "Non copiato: tienilo premuto e copia" : ""}</span>
    </span>
  );
}
