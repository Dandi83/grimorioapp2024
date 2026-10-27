import { GearBrowser } from "@/components/equipment/gear-browser";
import { gearListRows } from "@/lib/adventuring-gear-editions";
import { getCorrectedGear } from "@/lib/corrected-content";
import { sectionPage } from "@/lib/section-view";

export const metadata = { title: "Equipaggiamento d’avventura — Il Grimorio.App" };

// Manual corrections from the admin area appear within five minutes (at once after saving).
export const revalidate = 300;

export default async function GearPage() {
  // Before anything of the page: the gate of the layout runs in parallel and cannot stop what the page streams.
  await sectionPage("avventura");
  return <GearBrowser rows={gearListRows((await getCorrectedGear()).list)} />;
}
