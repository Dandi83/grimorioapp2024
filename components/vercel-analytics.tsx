"use client";

import { Analytics } from "@vercel/analytics/next";

/**
 * Vercel Analytics: the total of visits, also of who does not accept the statistics (no cookies). Script and data stay
 * on this site (/_vercel/insights). The address is sent without its query (no searched words), the reserved area never.
 */
export function VercelAnalytics() {
  return (
    <Analytics
      beforeSend={event => {
        const url = new URL(event.url);
        if (url.pathname.startsWith("/admin")) return null;
        return { ...event, url: `${url.origin}${url.pathname}` };
      }}
    />
  );
}
