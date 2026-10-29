"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAdminSession, useAdminSessionPending } from "@/components/admin-edit/admin-session";

type Summary = { adesso: number; persone: number; tornano: number; app: number };

/** «adesso» again every 30 seconds while the Home is in front; nothing while the tab is hidden. */
const REFRESH_MS = 30_000;
const number = (value: number) => value.toLocaleString("it-IT");

/** The green dot of «adesso»: a slow pulse, still with «riduci movimento». */
export function NowDot({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`inline-block size-2 shrink-0 rounded-full bg-[#9CD3B4] motion-safe:animate-[pulse_2.4s_ease-in-out_infinite] ${className}`} />;
}

/**
 * The strip of the Home for the administrator (PROMPT 18, proposal B «Mini riga con 3 numeri» with «adesso»): the
 * numbers of /admin/statistiche on the last 30 days, asked after the page from /api/admin/riepilogo and only once the
 * server confirmed the session. Visitors: nothing drawn and nothing asked, the cached Home stays the same.
 * Labels shorten when the strip is narrow («ora», «app»), never on two lines.
 */
export function AdminStrip() {
  const admin = useAdminSession();
  const pending = useAdminSessionPending();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!admin) return;
    let live = true;
    const ask = async (onlyNow: boolean) => {
      try {
        const response = await fetch(`/api/admin/riepilogo${onlyNow ? "?adesso=1" : ""}`, { cache: "no-store", credentials: "same-origin" });
        if (!response.ok) throw new Error(String(response.status));
        const data = await response.json() as Partial<Summary>;
        if (!live) return;
        if (onlyNow) setSummary(current => current && typeof data.adesso === "number" ? { ...current, adesso: data.adesso } : current);
        else setSummary(data as Summary);
      } catch {
        // The first answer failed: no strip. A later «adesso» that fails leaves the last numbers.
        if (live && !onlyNow) setFailed(true);
      }
    };
    void ask(false);
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => { if (!timer) timer = setInterval(() => void ask(true), REFRESH_MS); };
    const stop = () => { clearInterval(timer); timer = undefined; };
    const visibility = () => {
      if (document.visibilityState === "visible") { void ask(true); start(); } else stop();
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", visibility);
    return () => { live = false; stop(); document.removeEventListener("visibilitychange", visibility); };
  }, [admin]);

  if (failed || (!admin && !pending)) return null;
  const value = (pick: (data: Summary) => string) => (summary ? pick(summary) : "—");
  const label = summary
    ? `Statistiche: ${number(summary.adesso)} ${summary.adesso === 1 ? "persona" : "persone"} adesso, ${number(summary.persone)} ${summary.persone === 1 ? "persona" : "persone"} negli ultimi 30 giorni, il ${summary.tornano} per cento tornano, ${number(summary.app)} usano l’app. Apri le statistiche.`
    : "Statistiche in arrivo. Apri le statistiche.";
  const item = (key: string, shown: string, long: string, short: string, color = "#FFFBF0", dot = false) => (
    <span className="flex min-w-0 items-baseline gap-1 whitespace-nowrap" data-strip-item={key}>
      {dot && <NowDot className="self-center" />}
      <b className="font-serif text-[20px] font-bold leading-none" style={{ color }}>{shown}</b>
      <span className="text-[12px] text-[#E9DEC8]">
        <span className="@[470px]:hidden">{short}</span><span className="hidden @[470px]:inline">{long}</span>
      </span>
    </span>
  );
  return (
    <Link href="/admin/statistiche" prefetch={false} aria-label={label} data-admin-strip={summary ? "ready" : "loading"}
      className="@container mx-3 my-3 block rounded-xl bg-[#2B2118] text-[#FFFBF0] lg:mx-6">
      <span aria-hidden="true" className="flex min-h-11 items-center gap-3 overflow-hidden px-3 py-2">
        {item("adesso", value(data => number(data.adesso)), "adesso", "ora", "#FFFBF0", true)}
        {item("persone", value(data => number(data.persone)), "persone", "persone")}
        {item("tornano", value(data => `${data.tornano}%`), "tornano", "tornano")}
        {item("app", value(data => number(data.app)), "usano l’app", "app", "#9CD3B4")}
        <span className="ml-auto pl-1 text-[22px] leading-none text-[#E0A21A]">›</span>
      </span>
    </Link>
  );
}
