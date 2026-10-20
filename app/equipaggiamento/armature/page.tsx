import { ArmorBrowser } from "@/components/equipment/armor-browser";
import { armorListItems, armorTimes, sameNumbers } from "@/lib/armor";

export const metadata = { title: "Armature — Equipaggiamento — Il Grimorio.App" };

export default function ArmorPage() {
  return <ArmorBrowser items={armorListItems()} times={armorTimes} sameNumbers={sameNumbers} />;
}
