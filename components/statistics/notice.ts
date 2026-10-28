"use client";

import { useSyncExternalStore } from "react";

/**
 * The statistics bar and the invite to install the app are never shown together: the invite waits until the bar
 * is closed («Ok» or «No») or not due at all (answered in an earlier visit, statistics off, administrator's device).
 * "waiting": the status of the statistics is not known yet; "open": the bar is due (shown, or waiting for the
 * welcome screen to close); "closed": nothing in the way of the invite.
 * The question of the Home («Come ti trovi con il Grimorio?») waits for both: it needs the bar closed, this browser
 * counted (not «No», not an administrator's device) and no invite due (components/home/rating-box.tsx).
 */
export type NoticeState = "waiting" | "open" | "closed";
/** The invite to install the app: "waiting" for its moment, "shown", "none" (not due, closed, already installed). */
export type InviteState = "waiting" | "shown" | "none";

type State = { notice: NoticeState; counted: boolean | null; invite: InviteState; rating: boolean; admin: boolean | null };
let state: State = { notice: "waiting", counted: null, invite: "waiting", rating: false, admin: null };
const listeners = new Set<() => void>();

function update(next: Partial<State>) {
  if (Object.entries(next).every(([key, value]) => state[key as keyof State] === value)) return;
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

export function setStatisticsNotice(next: NoticeState) {
  update({ notice: next });
}

/** This browser is counted (statistics on, not «No», not an administrator's device); null while unknown. */
export function setStatisticsCounted(next: boolean | null) {
  update({ counted: next });
}

/** An administrator's device (never counted, never shown the occasional support card); null while unknown. */
export function setAdminDevice(next: boolean | null) {
  update({ admin: next });
}

export function setInstallInvite(next: InviteState) {
  update({ invite: next });
}

/** The question of the Home is on screen: the invite to install waits until it is answered or closed. */
export function setRatingShown(next: boolean) {
  update({ rating: next });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useStatisticsNotice(): NoticeState {
  return useSyncExternalStore(subscribe, () => state.notice, () => "waiting");
}

export function useRatingShown(): boolean {
  return useSyncExternalStore(subscribe, () => state.rating, () => false);
}

/** Everything the question of the Home waits for. */
export function useHomeNotices(): State {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
