import { WeaponsBrowser } from "@/components/equipment/weapons-browser";
import { getCorrectedWeapons } from "@/lib/corrected-content";
import { weaponListItems } from "@/lib/equipment";

export const metadata = { title: "Armi — Il Grimorio.App" };

// Manual corrections from the admin area appear within five minutes (at once after saving).
export const revalidate = 300;

export default async function WeaponsPage() {
  return <WeaponsBrowser items={weaponListItems((await getCorrectedWeapons()).weapons)} />;
}
