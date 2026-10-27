import { WeaponsBrowser } from "@/components/equipment/weapons-browser";
import { getCorrectedWeapons } from "@/lib/corrected-content";
import { weaponListItems } from "@/lib/equipment";
import { sectionPage } from "@/lib/section-view";

export const metadata = { title: "Armi — Il Grimorio.App" };

// Manual corrections from the admin area appear within five minutes (at once after saving).
export const revalidate = 300;

export default async function WeaponsPage() {
  // Before anything of the page: the gate of the layout runs in parallel and cannot stop what the page streams.
  await sectionPage("armi");
  return <WeaponsBrowser items={weaponListItems((await getCorrectedWeapons()).weapons)} />;
}
