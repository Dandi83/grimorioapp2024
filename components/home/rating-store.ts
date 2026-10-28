"use client";

import { useSyncExternalStore } from "react";

import type { Vote } from "@/lib/analytics-events";

/**
 * «Come ti trovi con il Grimorio?», on this browser only (localStorage): the days the site was opened (the question
 * comes from the 3rd different day) and, after an answer or the ×, the moment it may come back (4 months later).
 * The Home has two places for it (phone and computer): this store keeps them in step.
 */
const DAYS_KEY = "grimorio.giorni-di-visita";
const PAUSE_KEY = "grimorio.valutazione-fino-al";
/** About 4 months. */
export const PAUSE_MS = 122 * 24 * 60 * 60 * 1000;
/** The question comes from this visit on (different days). */
export const VISIT_DAYS = 3;
/** The days remembered: the occasional support card comes from the 5th (components/support/support-card.tsx). */
const KEPT_DAYS = 5;

/** "question": the faces; "thanks": what follows the vote («Bene», or «Male» and «Così così»); "none": nothing. */
export type RatingView = { step: "none" } | { step: "question" } | { step: "thanks"; vote: Vote };

let view: RatingView = { step: "none" };
const listeners = new Set<() => void>();

function set(next: RatingView) {
  view = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useRatingView(): RatingView {
  return useSyncExternalStore(subscribe, () => view, () => view);
}

const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());

/** Today among the days of visit (the first 5 are kept: the question needs 3, the support card 5). */
export function recordVisitDay(): number {
  try {
    const days = JSON.parse(localStorage.getItem(DAYS_KEY) || "[]") as unknown;
    const list = Array.isArray(days) ? days.filter((day): day is string => typeof day === "string").slice(0, KEPT_DAYS) : [];
    if (!list.includes(today()) && list.length < KEPT_DAYS) {
      list.push(today());
      localStorage.setItem(DAYS_KEY, JSON.stringify(list));
    }
    return list.length;
  } catch {
    return 0;
  }
}

function paused(): boolean {
  try {
    return Number(localStorage.getItem(PAUSE_KEY) || 0) > Date.now();
  } catch {
    // Without storage the question would come back at every visit: never shown.
    return true;
  }
}

function pause() {
  try {
    localStorage.setItem(PAUSE_KEY, String(Date.now() + PAUSE_MS));
  } catch {}
}

/** The question is due on this browser: 3rd day of visit or later, no answer nor × in the last 4 months. */
export function ratingDue(): boolean {
  return recordVisitDay() >= VISIT_DAYS && !paused();
}

export function showQuestion() {
  if (view.step === "none") set({ step: "question" });
}

/** A face tapped: the pause starts at once, the thanks take the place of the question. */
export function answer(vote: Vote) {
  pause();
  set({ step: "thanks", vote });
}

/** The × of the question, «No, grazie» of the thanks, or a link followed. */
export function closeRating() {
  pause();
  set({ step: "none" });
}
