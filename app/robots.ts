import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

/**
 * robots.txt (PROMPT 45): everything public is open; the reserved area, the internal APIs and the pages that are not
 * meant for Google (noindex: account, personaggi, segnala, proponi, in arrivo, the shared favorites) stay out. Static.
 */
export const revalidate = 86400;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/account", "/personaggi", "/segnala", "/bestiario/proponi", "/in-arrivo/", "/preferiti/schede", "/ricerca-indice.json", "/sw.js"],
    }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
