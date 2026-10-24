"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { ADMIN_HINT_COOKIE } from "@/lib/admin-edit-link";
import { refreshSavedPage } from "@/lib/admin-edit-return";

const AdminSessionContext = createContext(false);

const hinted = () => document.cookie.split(";").some(part => part.trim().startsWith(`${ADMIN_HINT_COOKIE}=`));

/**
 * The administrator browsing the public site, from the root layout: true only after the server confirms
 * a valid session (/api/admin/sessione), asked on every page and when the app comes back to the front.
 * Visitors never ask (no hint cookie). Never part of the server HTML: the pages cached for everyone and
 * their offline copies stay the same; after «Esci» the hint is gone and the buttons with it.
 */
export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [admin, setAdmin] = useState(false);

  // A card a save went back to: shown again from the browser's memory, it is loaded again (lib/admin-edit-return.ts).
  useEffect(() => {
    refreshSavedPage(false);
    const shown = (event: PageTransitionEvent) => { if (event.persisted) refreshSavedPage(true); };
    window.addEventListener("pageshow", shown);
    return () => window.removeEventListener("pageshow", shown);
  }, []);

  useEffect(() => {
    if (pathname?.startsWith("/admin")) return;
    let cancelled = false;
    const check = async () => {
      if (!hinted()) { setAdmin(false); return; }
      try {
        const response = await fetch("/api/admin/sessione", { cache: "no-store", credentials: "same-origin" });
        const { admin: valid } = await response.json() as { admin?: unknown };
        if (cancelled) return;
        setAdmin(valid === true);
        // An expired session: the hint goes too, so the pages stop asking.
        if (valid !== true) document.cookie = `${ADMIN_HINT_COOKIE}=; Max-Age=0; Path=/; Secure`;
      } catch {
        if (!cancelled) setAdmin(false);
      }
    };
    void check();
    const visible = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", visible);
    return () => { cancelled = true; document.removeEventListener("visibilitychange", visible); };
  }, [pathname]);

  return <AdminSessionContext.Provider value={admin && !pathname?.startsWith("/admin")}>{children}</AdminSessionContext.Provider>;
}

/** True when the administrator, with a session checked by the server, is looking at this public page. */
export function useAdminSession(): boolean {
  return useContext(AdminSessionContext);
}
