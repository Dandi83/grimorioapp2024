import { Breadcrumbs } from "@/components/seo/json-ld";
import { pageMetadata } from "@/lib/seo";
import { GearBrowser } from "@/components/equipment/gear-browser";
import { gearListRows } from "@/lib/adventuring-gear-editions";
import { getCorrectedGear } from "@/lib/corrected-content";
import { sectionPage } from "@/lib/section-view";

export const metadata = pageMetadata({ name: "Equipaggiamento d’avventura", section: "Equipaggiamento", path: "/equipaggiamento/avventura",
  description: "L’equipaggiamento d’avventura di D&D 5e in italiano, 2014 e 2024: oggetti, dotazioni e contenitori con costo, peso e uso." });

// Manual corrections from the admin area appear within five minutes (at once after saving).
export const revalidate = 300;

export default async function GearPage() {
  // Before anything of the page: the gate of the layout runs in parallel and cannot stop what the page streams.
  await sectionPage("avventura");
  return <><Breadcrumbs crumbs={[{ name: "Equipaggiamento", path: "/equipaggiamento" }, { name: "Equipaggiamento d’avventura", path: "/equipaggiamento/avventura" }]} /><GearBrowser rows={gearListRows((await getCorrectedGear()).list)} /></>;
}
