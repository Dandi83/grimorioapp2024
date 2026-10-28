"use client";

import { useEffect, useId, useSyncExternalStore } from "react";

import { CupIcon } from "@/components/support/cup-icon";
import { SupportLink } from "@/components/support/support-link";
import { ratingDue, recordVisitDay, useRatingView } from "@/components/home/rating-store";
import { setRatingShown, useHomeNotices } from "@/components/statistics/notice";

const PAUSE_KEY = "grimorio.sostieni-fino-al";
/** About 2 months. */
export const SUPPORT_PAUSE_MS = 61 * 24 * 60 * 60 * 1000;
/** The card comes from this day of visit on (different days). */
export const SUPPORT_VISIT_DAYS = 5;

// Decided once per page load and shared by the two places of the Home (phone and computer).
let decided = false;
let shown = false;
const listeners = new Set<() => void>();
function set(next: boolean) {
  shown = next;
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function paused(): boolean {
  try {
    return Number(localStorage.getItem(PAUSE_KEY) || 0) > Date.now();
  } catch {
    return true;
  }
}

function close() {
  try {
    localStorage.setItem(PAUSE_KEY, String(Date.now() + SUPPORT_PAUSE_MS));
  } catch {}
  set(false);
  setRatingShown(false);
}

/**
 * «Ti serve al tavolo? Offrimi un caffè» (canvas «Sostieni il Grimorio», ③), in the Home flow above the share card:
 * from the 5th day of visit, at most once every 2 months (after the × or a tap on «Sostieni»), never in the same
 * visit as the question with the faces, the statistics bar or the invite to install, never on an administrator's
 * device. Nothing without the Ko-fi address (lib/support.ts).
 */
export function SupportCard({ enabled }: { enabled: boolean }) {
  const visible = useSyncExternalStore(subscribe, () => shown, () => false);
  const { notice, invite, admin } = useHomeNotices();
  const rating = useRatingView();
  const id = useId();
  useEffect(() => {
    if (!enabled || decided || notice === "waiting" || invite === "waiting" || admin === null) return;
    decided = true;
    // Another notice now (or the question due): the card waits for a later visit.
    const free = notice === "closed" && invite === "none" && !admin && rating.step === "none" && !ratingDue();
    if (free && recordVisitDay() >= SUPPORT_VISIT_DAYS && !paused()) set(true);
  }, [enabled, notice, invite, admin, rating.step]);
  useEffect(() => {
    if (visible) setRatingShown(true);
  }, [visible]);

  if (!enabled || !visible) return null;
  return (
    <section aria-labelledby={id} data-support-card="" className="flex flex-col gap-2.5 rounded-[18px] bg-[#2B2118] p-3.5 text-[#F6EFDF]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <CupIcon size={30} color="#E0A21A" />
          <h2 id={id} className="font-serif text-[21px] font-semibold leading-[1.15]">Ti serve al tavolo? Offrimi un caffè</h2>
        </div>
        <button type="button" aria-label="Chiudi" onClick={close}
          className="-mr-2 -mt-2.5 flex size-11 shrink-0 items-center justify-center rounded-full text-[#D8CBB2] focus-visible:outline-2 focus-visible:outline-[#E0A21A]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
      <p className="text-[14px] leading-[1.45] text-[#D8CBB2]">Il Grimorio cresce grazie alla passione e a chi lo sostiene. Anche un piccolo aiuto fa la differenza.</p>
      <SupportLink enabled from="card" onClick={close}
        className="inline-flex min-h-11 items-center self-start rounded-full bg-[#E0A21A] px-[18px] text-[15px] font-bold text-[#2B2118] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F6EFDF]">
        Sostieni il Grimorio
      </SupportLink>
    </section>
  );
}
