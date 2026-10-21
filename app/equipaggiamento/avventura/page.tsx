import { GearBrowser } from "@/components/equipment/gear-browser";
import { gearListItems } from "@/lib/adventuring-gear";

export const metadata = { title: "Equipaggiamento d’avventura — Il Grimorio.App" };

export default function GearPage() {
  return <GearBrowser items={gearListItems()} />;
}
