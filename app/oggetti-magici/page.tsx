import { MagicItemsBrowser } from "@/components/magic-items/magic-items-browser";
import { magicItemsRulesHref } from "@/lib/magic-items";
import { magicItemEditionRows } from "@/lib/magic-items-editions";

export const metadata = { title: "Oggetti magici — Il Grimorio.App" };

export default function MagicItemsPage() {
  return <MagicItemsBrowser rows={magicItemEditionRows()} rulesHref={magicItemsRulesHref()} />;
}
