"use client";

import { useEffect, useState } from "react";

const dateFormat = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/**
 * Registers the offline service worker, or removes it when the emergency switch is off.
 * hiddenPaths: addresses of the hidden sections, whose saved copies the worker deletes.
 * partPaths: addresses of the sections with hidden parts and which parts: when that changes, the copies
 * saved before are deleted (they could still hold a part now hidden).
 */
export function ServiceWorker({ enabled, hiddenPaths = [], partPaths = [] }: { enabled: boolean; hiddenPaths?: readonly string[]; partPaths?: readonly { path: string; signature: string }[] }) {
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const hiddenKey = JSON.stringify([hiddenPaths, partPaths]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !enabled || !("serviceWorker" in navigator)) return;
    const [paths, parts] = JSON.parse(hiddenKey) as [string[], { path: string; signature: string }[]];
    void navigator.serviceWorker.ready.then(registration => {
      registration.active?.postMessage({ type: "hidden-sections", paths, parts });
    }).catch(() => {});
  }, [enabled, hiddenKey]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    if (!enabled) {
      void (async () => {
        for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
        for (const key of await caches.keys()) if (key.startsWith("grimorio-")) await caches.delete(key);
      })().catch(() => {});
      return;
    }
    let cancelled = false;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    void navigator.serviceWorker.ready.then(registration => {
      // Files this page loaded before the service worker could save them.
      const urls = performance.getEntriesByType("resource").map(entry => entry.name);
      registration.active?.postMessage({ type: "cache-files", urls });
    });
    // Was this page shown from the copy saved on the phone? The worker marks the page, so
    // the notice survives a worker stopped in the meantime. Asking is still needed: it also
    // clears the worker's own record, which must not reach the next page loaded online.
    const marked = Number(document.querySelector('meta[name="grimorio-saved-at"]')?.getAttribute("content"));
    if (marked) setSavedAt(marked);
    const controller = navigator.serviceWorker.controller;
    if (controller) {
      const channel = new MessageChannel();
      channel.port1.onmessage = event => { if (!cancelled && event.data?.savedAt) setSavedAt(event.data.savedAt); };
      controller.postMessage({ type: "saved-copy?", path: window.location.pathname }, [channel.port2]);
    }
    return () => { cancelled = true; };
  }, [enabled]);

  if (!savedAt) return null;
  return (
    <div role="status" className="mx-3 mt-3 flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-card px-4 py-3 text-sm text-foreground">
      <span>Sei offline: questa pagina è la copia salvata il {dateFormat.format(savedAt)}.</span>
      <button type="button" onClick={() => window.location.reload()} className="min-h-11 shrink-0 rounded-lg border border-primary/40 px-3 text-primary">
        Riprova
      </button>
    </div>
  );
}
