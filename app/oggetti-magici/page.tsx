import { MagicItemsBrowser } from "@/components/magic-items/magic-items-browser";
import { magicItemListRows, magicItemsRulesHref } from "@/lib/magic-items";

export const metadata = { title: "Oggetti magici — Il Grimorio.App" };

export default function MagicItemsPage() {
  return <MagicItemsBrowser rows={magicItemListRows("2024")} source="SRD 5.2.1" rulesHref={magicItemsRulesHref()} />;
}
