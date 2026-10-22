import { ArmorBrowser } from "@/components/equipment/armor-browser";
import { armorListItems, armorTimes, sameNumbers } from "@/lib/armor";
import { getCorrectedArmors } from "@/lib/corrected-content";

export const metadata = { title: "Armature — Equipaggiamento — Il Grimorio.App" };

// Manual corrections from the admin area appear within five minutes (at once after saving).
export const revalidate = 300;

export default async function ArmorPage() {
  return <ArmorBrowser items={armorListItems((await getCorrectedArmors()).list)} times={armorTimes} sameNumbers={sameNumbers} />;
}
