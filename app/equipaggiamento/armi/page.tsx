import { WeaponsBrowser } from "@/components/equipment/weapons-browser";
import { getCorrectedWeapons } from "@/lib/corrected-content";
import { weaponListItems } from "@/lib/equipment";
import { sectionPage } from "@/lib/section-view";
import { englishName } from "@/lib/english-names";
import type { EquipmentEdition } from "@/lib/equipment-types";

export const metadata = { title: "Armi — Il Grimorio.App" };

// Manual corrections from the admin area appear within five minutes (at once after saving).
export const revalidate = 300;

export default async function WeaponsPage() {
  // Before anything of the page: the gate of the layout runs in parallel and cannot stop what the page streams.
  await sectionPage("armi");
  // The official English names (PROMPT 36): read here, on the server; the list gets only the names.
  const items = weaponListItems((await getCorrectedWeapons()).weapons).map(item => ({
    ...item,
    editions: Object.fromEntries(Object.entries(item.editions).map(([edition, weapon]) => {
      const en = englishName("armi", edition as EquipmentEdition, item.id);
      return [edition, en ? { ...weapon, en } : weapon];
    })),
  }));
  return <WeaponsBrowser items={items} />;
}
