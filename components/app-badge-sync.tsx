"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { BADGE_SYNC_EVENT, applyAppBadge, type BadgeNavigator } from "@/lib/app-badge";

/**
 * Realigns the number on the app icon with the new reports: when the app opens or comes back to the
 * front, on every page of the admin area and after a report is read, archived or deleted.
 * Only on devices the administrator subscribed to the notifications: visitors never ask the server.
 */
export function AppBadgeSync() {
  const pathname = usePathname();
  const admin = pathname?.startsWith("/admin") ?? false;

  useEffect(() => {
    const nav = navigator as Navigator & BadgeNavigator;
    if (typeof nav.setAppBadge !== "function" || !("serviceWorker" in navigator)) return;
    let cancelled = false;
    const sync = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration?.pushManager || !(await registration.pushManager.getSubscription())) return;
        const response = await fetch("/api/admin/badge", { cache: "no-store", credentials: "same-origin" });
        if (!response.ok || cancelled) return;
        const { count } = await response.json() as { count?: unknown };
        if (typeof count === "number") await applyAppBadge(nav, count);
      } catch {
        // offline or not supported: the badge stays as it is
      }
    };
    const visible = () => { if (document.visibilityState === "visible") void sync(); };
    void sync();
    document.addEventListener("visibilitychange", visible);
    window.addEventListener(BADGE_SYNC_EVENT, sync);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener(BADGE_SYNC_EVENT, sync);
    };
  }, [admin, pathname]);

  return null;
}
