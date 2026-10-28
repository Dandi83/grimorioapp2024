"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { VOTES, type Vote } from "@/lib/analytics-events";
import { shareApp } from "@/lib/share-app";
import { setRatingShown, useHomeNotices } from "@/components/statistics/notice";
import { Face, ShareIcon, VOTE_LABELS } from "@/components/home/faces";
import { answer, closeRating, ratingDue, showQuestion, useRatingView } from "@/components/home/rating-store";

/** «Segnala» with the type «Consiglio» chosen and the inner label «dalla valutazione: <voto>». */
const writeHref = (vote: Vote) => `/segnala?tipo=consiglio&valutazione=${vote}`;

/**
 * «Come ti trovi con il Grimorio?» (canvas «Valutazione Il Grimorio.App», ①, ② and ⑤), in the Home flow above the
 * share card. Only from the 3rd day of visit, never together with the statistics bar or the invite to install the
 * app, never to who said «No» or to an administrator's device; after an answer or the ×, not for 4 months.
 * The vote is sent at the tap, anonymous: only the vote and the kind of device (lib/analytics.ts, storeRating).
 */
export function RatingBox() {
  const view = useRatingView();
  const { notice, counted, invite } = useHomeNotices();
  const free = notice === "closed" && counted === true && invite === "none";
  useEffect(() => {
    if (free && ratingDue()) showQuestion();
  }, [free]);
  // While it is on screen the invite to install waits (components/install-prompt.tsx).
  const shown = view.step !== "none";
  useEffect(() => {
    setRatingShown(shown);
  }, [shown]);

  const ids = { question: useId(), thanks: useId() };
  const thanks = useRef<HTMLHeadingElement>(null);
  const [note, setNote] = useState("");
  useEffect(() => {
    if (view.step === "thanks") thanks.current?.focus();
  }, [view.step]);
  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote(""), 2000);
    return () => clearTimeout(timer);
  }, [note]);

  if (view.step === "none") return null;

  if (view.step === "question") {
    const vote = (value: Vote) => {
      window.dispatchEvent(new CustomEvent("grimorio:analytics-event", { detail: { event: "valutazione", vote: value } }));
      answer(value);
    };
    return (
      <section aria-labelledby={ids.question} data-rating="domanda"
        className="flex flex-col gap-2.5 rounded-2xl border border-[#DDCFAE] bg-[#FFFBF0] px-3.5 pb-3 pt-3.5">
        <div className="flex items-center justify-between gap-2">
          <h2 id={ids.question} className="text-[17px] font-bold text-[#2B2118]">Come ti trovi con il Grimorio?</h2>
          <button type="button" aria-label="Chiudi" onClick={closeRating}
            className="-my-2.5 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-[22px] leading-none text-[#5E4E3E] focus-visible:outline-2 focus-visible:outline-[#7A1F2B]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div role="group" aria-label="Valutazione" className="grid grid-cols-3 gap-2">
          {VOTES.map(value => (
            <button key={value} type="button" aria-label={VOTE_LABELS[value]} onClick={() => vote(value)} data-vote={value}
              className="flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-[14px] border-[1.5px] border-[#DDCFAE] bg-[#F6EFDF] text-[13px] font-semibold text-[#5E4E3E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7A1F2B] active:bg-[#EDE3CC]">
              <Face vote={value} />
              {VOTE_LABELS[value]}
            </button>
          ))}
        </div>
      </section>
    );
  }

  const good = view.vote === "bene";
  async function share() {
    const result = await shareApp("valutazione");
    if (result === "copied") setNote("Link copiato");
    else if (result === "failed") setNote("Copia non riuscita");
  }
  return (
    <section aria-labelledby={ids.thanks} data-rating={good ? "grazie-bene" : "grazie"}
      className="relative flex flex-col gap-2.5 rounded-2xl border border-[#9CC5AE] bg-[#E6F0EA] px-3.5 pb-3 pt-3.5">
      <div className="flex items-center gap-2.5">
        <Face vote="bene" size={28} />
        <h2 id={ids.thanks} ref={thanks} tabIndex={-1} className="text-[17px] font-bold text-[#1F4D33] outline-none">
          {good ? "Grazie! Ti piace? Fallo conoscere" : "Grazie! Vuoi dirci di più?"}
        </h2>
      </div>
      <p className="text-[14px] leading-[1.4] text-[#2F5A41]">
        {good ? "Mandalo al tuo gruppo: giocatori e master lo usano gratis, anche al tavolo." : "Un consiglio, un errore, una sezione che ti manca: lo leggiamo tutto."}
      </p>
      <div className="grid grid-cols-[2fr_1fr] gap-2">
        {good ? (
          <>
            <button type="button" onClick={() => void share()}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#7A1F2B] text-[16px] font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B2118]">
              <ShareIcon size={20} />Condividi
            </button>
            <Link href={writeHref(view.vote)} prefetch={false} onClick={closeRating}
              className="flex min-h-12 items-center justify-center rounded-xl border border-[#9CC5AE] text-[15px] font-semibold text-[#1F4D33]">
              Scrivici
            </Link>
          </>
        ) : (
          <>
            <Link href={writeHref(view.vote)} prefetch={false} onClick={closeRating}
              className="flex min-h-12 items-center justify-center rounded-xl bg-[#7A1F2B] text-[16px] font-bold text-white">
              Scrivici
            </Link>
            <button type="button" onClick={closeRating}
              className="min-h-12 rounded-xl border border-[#9CC5AE] text-[15px] font-semibold text-[#1F4D33]">
              No, grazie
            </button>
          </>
        )}
      </div>
      <p role="status" aria-live="polite"
        className={note ? "absolute inset-x-0 -top-10 mx-auto w-max rounded-full bg-[#2B2118] px-4 py-1.5 text-[14px] font-semibold text-[#FFFBF0] shadow-lg" : "sr-only"}>
        {note}
      </p>
    </section>
  );
}
