import { GearBrowser } from "@/components/equipment/gear-browser";
import { gearListRows } from "@/lib/adventuring-gear-editions";

export const metadata = { title: "Equipaggiamento d’avventura — Il Grimorio.App" };

export default function GearPage() {
  return <GearBrowser rows={gearListRows()} />;
}
