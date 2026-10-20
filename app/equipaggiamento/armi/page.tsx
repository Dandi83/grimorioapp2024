import { WeaponsBrowser } from "@/components/equipment/weapons-browser";
import { weaponListItems } from "@/lib/equipment";

export const metadata = { title: "Armi — Il Grimorio.App" };

export default function WeaponsPage() {
  return <WeaponsBrowser items={weaponListItems()} />;
}
