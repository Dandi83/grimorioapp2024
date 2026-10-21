import { MagicItemsBrowser } from "@/components/magic-items/magic-items-browser";
import { magicItemsRulesHref } from "@/lib/magic-items";
import { magicItemEditionRows } from "@/lib/magic-items-editions";
import { getCorrectedMagicItems } from "@/lib/corrected-content";

export const metadata = { title: "Oggetti magici — Il Grimorio.App" };

// Manual corrections from the admin area appear within five minutes (at once after saving).
export const revalidate = 300;

export default async function MagicItemsPage() {
  return <MagicItemsBrowser rows={magicItemEditionRows((await getCorrectedMagicItems()).list)} rulesHref={magicItemsRulesHref()} />;
}
