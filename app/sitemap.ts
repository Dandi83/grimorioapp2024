import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";
import { sitemapPaths } from "@/lib/sitemap";

/**
 * sitemap.xml (PROMPT 45), the addresses of lib/sitemap.ts. Rebuilt at most once a day (ISR) and at once when the admin
 * switches a visibility (the actions call revalidatePath("/sitemap.xml")): one ISR write a day, not one per page.
 */
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return (await sitemapPaths()).map(path => ({ url: path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}` }));
}
