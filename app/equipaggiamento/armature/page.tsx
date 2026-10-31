import { ArmorBrowser } from "@/components/equipment/armor-browser";
import { armorListItems, armorTimes, sameNumbers } from "@/lib/armor";
import { getCorrectedArmors } from "@/lib/corrected-content";
import { sectionPage } from "@/lib/section-view";
import { englishName } from "@/lib/english-names";
import type { EquipmentEdition } from "@/lib/equipment-types";

const withEnglish = (edition: EquipmentEdition, id: string) => { const en = englishName("armature", edition, id); return en ? { en } : {}; };

export const metadata = { title: "Armature — Equipaggiamento — Il Grimorio.App" };

// Manual corrections from the admin area appear within five minutes (at once after saving).
export const revalidate = 300;

export default async function ArmorPage() {
  // Before anything of the page: the gate of the layout runs in parallel and cannot stop what the page streams.
  await sectionPage("armature");
  // The official English names (PROMPT 36): read here, on the server; the list gets only the names.
  const items = armorListItems((await getCorrectedArmors()).list).map(item => ({
    ...item,
    editions: {
      "2014": { ...item.editions["2014"], ...withEnglish("2014", item.id) },
      "2024": { ...item.editions["2024"], ...withEnglish("2024", item.id) },
    },
  }));
  return <ArmorBrowser items={items} times={armorTimes} sameNumbers={sameNumbers} />;
}
