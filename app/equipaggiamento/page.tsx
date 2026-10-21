import { Backpack, Shield, Swords } from "lucide-react";
import { ParentLink, SectionTiles, type SectionTile } from "@/components/section-tiles";
import { armors } from "@/lib/armor";
import { weapons } from "@/lib/equipment";

export const metadata = { title: "Equipaggiamento — Il Grimorio.App" };

/** Hub of the Equipaggiamento section; tools, adventuring gear, mounts and magic items will join here. */
export default function EquipmentPage() {
  const tiles: SectionTile[] = [
    { href: "/equipaggiamento/armi", title: "Armi", text: `${weapons.filter(w => w.editions["2024"]).length} armi nel 2024, ${weapons.filter(w => w.editions["2014"]).length} nel 2014`, Icon: Swords },
    { href: "/equipaggiamento/armature", title: "Armature", text: `${armors.length - 1} armature e lo scudo, 2014 e 2024`, Icon: Shield },
    { href: "/equipaggiamento/avventura", title: "Equipaggiamento d’avventura", text: "Oggetti e dotazioni, 2014 e 2024", Icon: Backpack },
  ];
  return (
    <div className="px-4 pb-8 pt-4 sm:px-6">
      <ParentLink href="/compendio" label="Compendio" />
      <h1 className="border-b-4 border-primary pb-3 font-serif text-[40px] font-bold leading-tight">Equipaggiamento</h1>
      <p className="mt-3 text-[15px] leading-6 text-muted">Dati dell’SRD 5.1 (2014) e dell’SRD 5.2.1 (2024), con le differenze tra le edizioni.</p>
      <SectionTiles tiles={tiles} />
    </div>
  );
}
