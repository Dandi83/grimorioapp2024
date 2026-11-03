"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/**
 * PROMPT 57: the scripts that nobody is waiting for at the start (statistics, app icon badge, Vercel Analytics) come
 * after the page has loaded and the browser is idle, in their own chunk: the first paint, the hero picture and the
 * hydration of the page run without them. Nothing is drawn on the server for them anyway.
 */
const Analytics = dynamic(() => import("@/components/analytics-provider").then(module => module.AnalyticsProvider), { ssr: false });
const Badge = dynamic(() => import("@/components/app-badge-sync").then(module => module.AppBadgeSync), { ssr: false });
const Vercel = dynamic(() => import("@/components/vercel-analytics").then(module => module.VercelAnalytics), { ssr: false });

export function whenPageIdle(callback: () => void, timeout = 1500): () => void {
  let handle = 0;
  let cancelled = false;
  const idle = () => {
    if (cancelled) return;
    if (typeof window.requestIdleCallback === "function") handle = window.requestIdleCallback(() => callback(), { timeout });
    else handle = window.setTimeout(callback, 200);
  };
  if (document.readyState === "complete") idle();
  else window.addEventListener("load", idle, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener("load", idle);
    if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(handle);
    window.clearTimeout(handle);
  };
}

/**
 * The events of the page (a share, a vote: «grimorio:analytics-event») fired before the statistics provider is mounted
 * are kept and sent again when it says it listens («grimorio:analytics-ready»): nothing is lost in the first second.
 */
function keepEarlyEvents(): () => void {
  const kept: Event[] = [];
  const keep = (event: Event) => { kept.push(event); };
  const replay = () => {
    window.removeEventListener("grimorio:analytics-event", keep);
    window.removeEventListener("grimorio:analytics-ready", replay);
    for (const event of kept) window.dispatchEvent(new CustomEvent(event.type, { detail: (event as CustomEvent).detail }));
    kept.length = 0;
  };
  window.addEventListener("grimorio:analytics-event", keep);
  window.addEventListener("grimorio:analytics-ready", replay);
  return () => { window.removeEventListener("grimorio:analytics-event", keep); window.removeEventListener("grimorio:analytics-ready", replay); };
}

export function LateExtras({ vercel }: { vercel: boolean }) {
  const [ready, setReady] = useState(false);
  useEffect(() => keepEarlyEvents(), []);
  useEffect(() => whenPageIdle(() => setReady(true)), []);
  if (!ready) return null;
  return (
    <>
      <Badge />
      <Analytics />
      {vercel && <Vercel />}
    </>
  );
}
