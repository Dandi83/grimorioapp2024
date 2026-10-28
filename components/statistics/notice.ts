"use client";

import { useSyncExternalStore } from "react";

/**
 * The statistics bar and the invite to install the app are never shown together: the invite waits until the bar
 * is closed («Ok» or «No») or not due at all (answered in an earlier visit, statistics off, administrator's device).
 * "waiting": the status of the statistics is not known yet; "open": the bar is due (shown, or waiting for the
 * welcome screen to close); "closed": nothing in the way of the invite.
 */
export type NoticeState = "waiting" | "open" | "closed";

let state: NoticeState = "waiting";
const listeners = new Set<() => void>();

export function setStatisticsNotice(next: NoticeState) {
  if (next === state) return;
  state = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useStatisticsNotice(): NoticeState {
  return useSyncExternalStore(subscribe, () => state, () => "waiting");
}
