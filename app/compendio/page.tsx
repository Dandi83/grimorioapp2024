import { Backpack, Gem, Shield, ShieldAlert, TrendingUp } from "lucide-react";
import { SectionTiles, type SectionTile } from "@/components/section-tiles";
import { EQUIPMENT_SECTIONS, type PublicSectionKey } from "@/lib/public-sections";
import { sectionView } from "@/lib/section-view";

export const metadata = { title: "Compendio — Il Grimorio.App" };

type Tile = SectionTile & { sections: readonly PublicSectionKey[] };

// New sections are added here when they exist (no empty tiles: Specie, Background e Talenti come later).
const CHARACTERS: Tile[] = [
  { href: "/classi", title: "Classi", text: "Barbaro, Bardo, Chierico…", Icon: Shield, square: true, sections: ["classi"] },
];

const TILES: Tile[] = [
  { href: "/equipaggiamento", title: "Equipaggiamento", text: "Armi, armature e altro", Icon: Backpack, sections: EQUIPMENT_SECTIONS },
  { href: "/avanzamento", title: "Avanzamento di livello", text: "PE, bonus di competenza e punti ferita", Icon: TrendingUp, sections: ["avanzamento"] },
  { href: "/oggetti-magici", title: "Oggetti magici", text: "Elenco A–Z con rarità e sintonia", Icon: Gem, sections: ["oggetti-magici"] },
  { href: "/compendio/condizioni", title: "Condizioni", text: "Accecato, Avvelenato, Spaventato…", Icon: ShieldAlert, sections: ["condizioni"] },
];

function GroupLabel({ children }: { children: string }) {
  return <h2 className="mt-6 text-[12px] font-bold uppercase tracking-[0.08em] text-[#5E4E3E]">{children}</h2>;
}

export default async function CompendiumPage() {
  // Hidden sections (/admin/sezioni): a tile goes when all its sections are hidden, a group when it is empty.
  const { hidden, admin } = await sectionView();
  const shown = (tiles: Tile[]) => tiles.flatMap(({ sections, ...tile }) => {
    const off = sections.every(key => hidden.includes(key));
    return !off ? [tile] : admin ? [{ ...tile, hidden: true }] : [];
  });
  const groups = [{ label: "Personaggi", tiles: shown(CHARACTERS) }, { label: "Regole e oggetti", tiles: shown(TILES) }].filter(group => group.tiles.length);
  return (
    <div className="px-4 pb-8 pt-8 sm:px-6">
      <h1 className="border-b-4 border-primary pb-3 font-serif text-[40px] font-bold leading-tight">Compendio</h1>
      <p className="mt-3 text-[15px] leading-6 text-muted">Regole, equipaggiamento e strumenti per il tavolo</p>
      {groups.map(group => (
        <section key={group.label}>
          <GroupLabel>{group.label}</GroupLabel>
          <SectionTiles tiles={group.tiles} label={group.label} className="mt-2.5" />
        </section>
      ))}
    </div>
  );
}
