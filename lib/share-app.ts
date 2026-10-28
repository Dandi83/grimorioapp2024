"use client";

import type { ShareFrom } from "./analytics-events";

/** The sharing of the whole app (card «Porta il Grimorio al tavolo», invite after «Bene»): always the same message. */
export const APP_SHARE = {
  title: "Il Grimorio.App",
  text: "Ti consiglio Il Grimorio.App: incantesimi, mostri e regole di D&D 2014 e 2024 in italiano, gratis.",
  url: "https://ilgrimorio.app/?da=amico",
} as const;

/** The mark of a friend's link: counted once (arrivo_da_amico), then removed from the address. */
export const FRIEND_PARAM = "da";
export const FRIEND_VALUE = "amico";

export type ShareResult = "sent" | "copied" | "cancelled" | "failed";

/** Tells the statistics (components/analytics-provider.tsx), which send it only for a counted browser. */
function track(event: "share_tap" | "share_sent" | "share_cancel", from: ShareFrom) {
  window.dispatchEvent(new CustomEvent("grimorio:analytics-event", { detail: { event, from } }));
}

/**
 * The phone's share menu with the message and the link; without it (most computers) the message and the link
 * are copied. Closing the menu is not an error: "cancelled", nothing shown.
 */
export async function shareApp(from: ShareFrom): Promise<ShareResult> {
  track("share_tap", from);
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: APP_SHARE.title, text: APP_SHARE.text, url: APP_SHARE.url });
      track("share_sent", from);
      return "sent";
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") {
        track("share_cancel", from);
        return "cancelled";
      }
      // Another refusal (no user gesture, not allowed here): the link is copied instead.
    }
  }
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(`${APP_SHARE.text} ${APP_SHARE.url}`);
    track("share_sent", from);
    return "copied";
  } catch {
    return "failed";
  }
}
