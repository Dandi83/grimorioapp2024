import { Breadcrumbs } from "@/components/seo/json-ld";
import { pageMetadata } from "@/lib/seo";
import { WeaponsBrowser } from "@/components/equipment/weapons-browser";
import { getCorrectedWeapons } from "@/lib/corrected-content";
import { weaponListItems } from "@/lib/equipment";
import { sectionPage } from "@/lib/section-view";
import { englishName } from "@/lib/english-names";
import type { EquipmentEdition } from "@/lib/equipment-types";

export const metadata = pageMetadata({ name: "Armi", section: "Equipaggiamento", path: "/equipaggiamento/armi",
  description: "Tutte le armi di D&D 5e in italiano, 2014 e 2024: danni, proprietà, padronanze, costo e peso, con le differenze tra le edizioni." });

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
  return <><Breadcrumbs crumbs={[{ name: "Equipaggiamento", path: "/equipaggiamento" }, { name: "Armi", path: "/equipaggiamento/armi" }]} /><WeaponsBrowser items={items} /></>;
}
