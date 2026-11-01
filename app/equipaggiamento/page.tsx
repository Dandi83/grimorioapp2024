import { Breadcrumbs } from "@/components/seo/json-ld";
import { pageMetadata } from "@/lib/seo";
import { Backpack, Hammer, Shield, Swords } from "lucide-react";
import { notFound } from "next/navigation";
import { ParentLink, SectionTiles, type SectionTile } from "@/components/section-tiles";
import { armors } from "@/lib/armor";
import { weapons } from "@/lib/equipment";
import { soonHref, type PublicSectionKey } from "@/lib/public-sections";
import { sectionView } from "@/lib/section-view";

export const metadata = pageMetadata({ name: "Equipaggiamento", section: "Compendio", path: "/equipaggiamento",
  description: "L’equipaggiamento di D&D 5e in italiano: armi, armature, equipaggiamento d’avventura e strumenti, con costi e pesi del 2014 e del 2024." });

/** Hub of the Equipaggiamento section; tools, adventuring gear, mounts and magic items will join here. */
export default async function EquipmentPage() {
  const tiles: (SectionTile & { section: PublicSectionKey })[] = [
    { href: "/equipaggiamento/armi", title: "Armi", text: `${weapons.filter(w => w.editions["2024"]).length} armi nel 2024, ${weapons.filter(w => w.editions["2014"]).length} nel 2014`, Icon: Swords, section: "armi" },
    { href: "/equipaggiamento/armature", title: "Armature", text: `${armors.length - 1} armature e lo scudo, 2014 e 2024`, Icon: Shield, section: "armature" },
    { href: "/equipaggiamento/avventura", title: "Equipaggiamento d’avventura", text: "Oggetti e dotazioni, 2014 e 2024", Icon: Backpack, section: "avventura" },
    { href: "/equipaggiamento/strumenti", title: "Strumenti", text: "Da artigiano, giochi e strumenti musicali, 2014 e 2024", Icon: Hammer, section: "strumenti" },
  ];
  // Hidden sections (/admin/sezioni) leave the hub; with all four hidden the hub is unavailable too.
  // «In arrivo»: the tile stays, attenuated, to the «in costruzione» page.
  const { hidden, soon, admin } = await sectionView();
  const shown = tiles.flatMap(({ section, ...tile }) => {
    if (!hidden.includes(section)) return [tile];
    if (admin) return [{ ...tile, hidden: true, soon: soon.includes(section) }];
    return soon.includes(section) ? [{ ...tile, soon: true, href: soonHref(section) }] : [];
  });
  if (!shown.length) notFound();
  return (
    <>
      <Breadcrumbs crumbs={[{ name: "Compendio", path: "/compendio" }, { name: "Equipaggiamento", path: "/equipaggiamento" }]} />
    <div className="px-4 pb-8 pt-4 sm:px-6">
      <ParentLink href="/compendio" label="Compendio" />
      <h1 className="border-b-4 border-primary pb-3 font-serif text-[40px] font-bold leading-tight">Equipaggiamento</h1>
      <p className="mt-3 text-[15px] leading-6 text-muted">Dati dell’SRD 5.1 (2014) e dell’SRD 5.2.1 (2024), con le differenze tra le edizioni.</p>
      <SectionTiles tiles={shown} />
    </div>
    </>
  );
}
