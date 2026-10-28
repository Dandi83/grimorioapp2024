"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { CupIcon } from "@/components/support/cup-icon";
import { trackSupport } from "@/components/support/support-link";
import { DEFAULT_AMOUNT, SUPPORT_AMOUNTS } from "@/lib/support";
import { shareApp } from "@/lib/share-app";

/**
 * The page /sostieni. Ko-fi does not document an amount in the address of a page, so the button opens the page of
 * Ko-fi as it is (a new tab); the amount chosen is counted, anonymous, to know which one people tap.
 */
export function SupportPage({ url }: { url: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState<number>(DEFAULT_AMOUNT);
  const [note, setNote] = useState("");
  async function share() {
    const result = await shareApp("sostieni");
    if (result === "copied") setNote("Link copiato");
    else if (result === "failed") setNote("Copia non riuscita");
    if (result === "copied" || result === "failed") setTimeout(() => setNote(""), 2000);
  }
  return (
    <article className="mx-auto flex max-w-xl flex-col bg-[#F6EFDF] px-4 pb-10 pt-4 text-[#2B2118] sm:px-6">
      <button type="button" onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
        className="inline-flex min-h-10 items-center self-start text-[15px] font-bold text-[#7A1F2B]">‹ Indietro</button>
      <div className="mt-2 flex flex-col gap-3.5 px-1">
        <img src="/icon-192.png" alt="" width={64} height={64} className="size-16 rounded-2xl shadow-[0_2px_6px_rgb(43_33_24_/_25%)]" />
        <h1 className="font-serif text-[36px] font-semibold leading-[1.05]">Sostieni il Grimorio</h1>
        <div className="flex flex-col gap-1.5">
          <p className="font-serif text-[21px] font-semibold italic leading-[1.25] text-[#7A1F2B]">Ogni grimorio cresce con chi lo sfoglia.</p>
          <p className="text-[16px] leading-[1.5] text-[#3D3128]">Il Grimorio si arricchisce una pagina alla volta, tra una sessione e l&apos;altra, per i master e i giocatori della community. Se ti ha salvato un turno, una ricerca o un&apos;intera serata di gioco, puoi aiutarlo a crescere ancora.</p>
        </div>
        <section aria-labelledby="sostieni-aiuto" className="flex flex-col gap-2 rounded-2xl border border-[#DDCFAE] bg-[#FFFBF0] p-3.5">
          <h2 id="sostieni-aiuto" className="text-[15px] font-bold">Il tuo aiuto, in concreto</h2>
          <ul className="list-disc pl-[18px] text-[14px] leading-[1.6] text-[#3D3128]">
            <li>tiene online il Grimorio, giorno e notte</li>
            <li>porta nuove sezioni e strumenti per i master</li>
            <li>dà il tempo di controllare e migliorare ogni scheda</li>
          </ul>
        </section>
        <div role="group" aria-label="Importo" className="grid grid-cols-3 gap-2">
          {SUPPORT_AMOUNTS.map(option => {
            const on = option.value === amount;
            return (
              <button key={option.value} type="button" aria-pressed={on} onClick={() => setAmount(option.value)} data-amount={option.value}
                className={`flex min-h-16 flex-col items-center justify-center rounded-[14px] text-[20px] font-bold ${on ? "border-2 border-[#7A1F2B] bg-[#F3E6E8] text-[#7A1F2B]" : "border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0] text-[#2B2118]"}`}>
                {option.value} €<span className={`text-[12px] font-normal ${on ? "text-[#7A1F2B]" : "text-[#5E4E3E]"}`}>{option.label}</span>
              </button>
            );
          })}
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer" onClick={() => trackSupport("support_click", { amount })} data-support-button=""
          className="flex min-h-[54px] items-center justify-center gap-2 rounded-[14px] bg-[#7A1F2B] text-[17px] font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B2118]">
          <CupIcon size={20} color="#FFFFFF" />Sostieni con {amount} €
        </a>
        <p className="text-center text-[12px] leading-[1.45] text-[#5E4E3E]">Pagamento sicuro su Ko-fi. Contributo libero, una volta sola.</p>
        <button type="button" onClick={() => void share()}
          className="flex min-h-10 items-center justify-center text-[14px] font-bold text-[#7A1F2B] underline-offset-4 hover:underline">
          Non puoi donare? Condividilo con il tuo gruppo
        </button>
        <p role="status" aria-live="polite" className={note ? "text-center text-[14px] font-semibold text-[#2B2118]" : "sr-only"}>{note}</p>
      </div>
    </article>
  );
}
