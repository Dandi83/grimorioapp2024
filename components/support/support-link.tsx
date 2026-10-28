"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import type { SupportFrom } from "@/lib/support";

/** Tells the statistics (components/analytics-provider.tsx), which send it only for a counted browser. */
export function trackSupport(event: "support_link" | "support_page" | "support_click", detail: { from?: SupportFrom; amount?: number } = {}) {
  window.dispatchEvent(new CustomEvent("grimorio:analytics-event", { detail: { event, ...detail } }));
}

/** A link to /sostieni, counted with where it was tapped («support_link»). Nothing at all without the Ko-fi address. */
export function SupportLink({ enabled, from, className, children, onClick }: { enabled: boolean; from: SupportFrom; className?: string; children: ReactNode; onClick?: () => void }) {
  if (!enabled) return null;
  return (
    <Link href="/sostieni" prefetch={false} className={className} data-support-link={from}
      onClick={() => { trackSupport("support_link", { from }); onClick?.(); }}>
      {children}
    </Link>
  );
}
