import { GearBrowser } from "@/components/equipment/gear-browser";
import { gearListRows } from "@/lib/adventuring-gear-editions";
import { getCorrectedGear } from "@/lib/corrected-content";

export const metadata = { title: "Equipaggiamento d’avventura — Il Grimorio.App" };

// Manual corrections from the admin area appear within five minutes (at once after saving).
export const revalidate = 300;

export default async function GearPage() {
  return <GearBrowser rows={gearListRows((await getCorrectedGear()).list)} />;
}
