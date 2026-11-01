import { Breadcrumbs } from "@/components/seo/json-ld";
import { pageMetadata } from "@/lib/seo";
import { MagicItemsBrowser } from "@/components/magic-items/magic-items-browser";
import { magicItemsRulesHref } from "@/lib/magic-items";
import { magicItemEditionRows } from "@/lib/magic-items-editions";
import { getCorrectedMagicItems } from "@/lib/corrected-content";
import { sectionPage } from "@/lib/section-view";

export const metadata = pageMetadata({ name: "Oggetti magici", section: "Compendio", path: "/oggetti-magici",
  description: "Gli oggetti magici di D&D 5e in italiano dalla A alla Z, 2014 e 2024: cerca per nome e filtra per tipo, rarità e sintonia." });

// Manual corrections from the admin area appear within five minutes (at once after saving).
export const revalidate = 300;

export default async function MagicItemsPage() {
  // Before anything of the page: the gate of the layout runs in parallel and cannot stop what the page streams.
  await sectionPage("oggetti-magici");
  return <><Breadcrumbs crumbs={[{ name: "Compendio", path: "/compendio" }, { name: "Oggetti magici", path: "/oggetti-magici" }]} /><MagicItemsBrowser rows={magicItemEditionRows((await getCorrectedMagicItems()).list)} rulesHref={magicItemsRulesHref()} /></>;
}
