import { Backpack, Gem, ShieldAlert, TrendingUp } from "lucide-react";
import { SectionTiles, type SectionTile } from "@/components/section-tiles";

export const metadata = { title: "Compendio — Il Grimorio.App" };

// New sections are added here when they exist.
const TILES: SectionTile[] = [
  { href: "/equipaggiamento", title: "Equipaggiamento", text: "Armi, armature e altro", Icon: Backpack },
  { href: "/avanzamento", title: "Avanzamento di livello", text: "PE, bonus di competenza e punti ferita", Icon: TrendingUp },
  { href: "/oggetti-magici", title: "Oggetti magici", text: "Elenco A–Z con rarità e sintonia", Icon: Gem },
  { href: "/compendio/condizioni", title: "Condizioni", text: "Accecato, Avvelenato, Spaventato…", Icon: ShieldAlert },
];

export default function CompendiumPage() {
  return (
    <div className="px-4 pb-8 pt-8 sm:px-6">
      <h1 className="border-b-4 border-primary pb-3 font-serif text-[40px] font-bold leading-tight">Compendio</h1>
      <p className="mt-3 text-[15px] leading-6 text-muted">Regole, equipaggiamento e strumenti per il tavolo</p>
      <SectionTiles tiles={TILES} />
    </div>
  );
}
