import { MagicItemsBrowser } from "@/components/magic-items/magic-items-browser";
import { magicItemsRulesHref } from "@/lib/magic-items";
import { magicItemEditionRows } from "@/lib/magic-items-editions";
import { getCorrectedMagicItems } from "@/lib/corrected-content";
import { sectionPage } from "@/lib/section-view";

export const metadata = { title: "Oggetti magici — Il Grimorio.App" };

// Manual corrections from the admin area appear within five minutes (at once after saving).
export const revalidate = 300;

export default async function MagicItemsPage() {
  // Before anything of the page: the gate of the layout runs in parallel and cannot stop what the page streams.
  await sectionPage("oggetti-magici");
  return <MagicItemsBrowser rows={magicItemEditionRows((await getCorrectedMagicItems()).list)} rulesHref={magicItemsRulesHref()} />;
}
