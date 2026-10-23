/**
 * The number on the app icon (Badging API): the reports still «nuova», the same number as the
 * «segnalazioni nuove» tile of /admin. 0 removes it. Devices without badges: nothing happens.
 * The service worker applies the same rule when a push arrives (lib/sw/service-worker.js).
 */
export interface BadgeNavigator { setAppBadge?: (count?: number) => Promise<void>; clearAppBadge?: () => Promise<void> }

export async function applyAppBadge(nav: BadgeNavigator, count: number): Promise<boolean> {
  if (!Number.isInteger(count) || count < 0) return false;
  try {
    if (count > 0 && typeof nav.setAppBadge === "function") await nav.setAppBadge(count);
    else if (count === 0 && typeof nav.clearAppBadge === "function") await nav.clearAppBadge();
    else return false;
    return true;
  } catch {
    // Badge not allowed (no notification permission) or not supported: never an error on screen.
    return false;
  }
}

/** Fired by the admin pages after a report changes state or is deleted: the badge is realigned. */
export const BADGE_SYNC_EVENT = "grimorio:badge";
