"use client";

import { useEffect, useId, useRef } from "react";
import Image from "next/image";

import { useUserEdition } from "@/components/edition/edition-provider";
import { trapFocus } from "@/components/edition/edition-pill";
import { EditionChoice } from "@/components/edition/edition-choice";
import { EDITIONS } from "@/lib/public-sections";

/**
 * «Con quale edizione giochi?»: full screen over the library of the Home, the first time the visit
 * starts on the Home and nobody has chosen yet (never over a direct link). Drawn only in the browser,
 * after loading: search engines and link previews see the Home as it is. A choice saves «la tua
 * edizione»; Esc (computers) closes it with 2024, and it does not come back.
 */
export function FirstLaunch() {
  const { firstLaunch } = useUserEdition();
  if (!firstLaunch) return null;
  return <FirstLaunchScreen />;
}

function FirstLaunchScreen() {
  const { choose } = useUserEdition();
  const titleId = useId();
  const first = useRef<HTMLButtonElement>(null);
  const chooseRef = useRef(choose);
  useEffect(() => { chooseRef.current = choose; }, [choose]);

  useEffect(() => {
    first.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") chooseRef.current("2024"); };
    window.addEventListener("keydown", escape);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", escape); document.body.style.overflow = ""; };
  }, []);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={trapFocus} data-first-launch=""
      className="fixed inset-0 z-[90] isolate flex flex-col overflow-y-auto">
      <Image src="/hero-atmosfera.webp" alt="" fill priority sizes="100vw" className="-z-20 object-cover object-[54%_42%]" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(43_33_24_/_55%)_0%,rgb(43_33_24_/_62%)_35%,rgb(43_33_24_/_88%)_70%,rgb(43_33_24_/_96%)_100%)]" />
      <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col px-5 pb-[calc(24px+env(safe-area-inset-bottom,0px))] pt-[calc(22px+env(safe-area-inset-top,0px))] text-card">
        <p className="font-serif text-[28px] font-semibold leading-none">Il Grimorio<span className="text-amber">.App</span></p>
        <div className="flex-1" />
        <h2 id={titleId} className="font-serif text-[40px] font-semibold leading-[1.08] tracking-[-0.4px]">Con quale edizione giochi?</h2>
        <p className="mt-3 text-[17px] leading-snug text-card/90">Incantesimi, bestiario, classi e regole partiranno sempre dalla tua edizione.</p>
        <div className="mt-7 flex flex-col gap-3">
          {EDITIONS.map((edition, index) => (
            <EditionChoice key={edition} ref={index === 0 ? first : undefined} edition={edition} onChoose={choose} />
          ))}
        </div>
        <p className="mt-4 text-center text-[15px] text-card/80">Puoi cambiarla quando vuoi dalla Home.</p>
      </div>
    </div>
  );
}
