import { Backpack, Gem, Shield, ShieldAlert, TrendingUp } from "lucide-react";
import { SectionTiles, type SectionTile } from "@/components/section-tiles";

export const metadata = { title: "Compendio — Il Grimorio.App" };

// New sections are added here when they exist (no empty tiles: Specie, Background e Talenti come later).
const CHARACTERS: SectionTile[] = [
  { href: "/classi", title: "Classi", text: "Barbaro, Bardo, Chierico…", Icon: Shield, square: true },
];

const TILES: SectionTile[] = [
  { href: "/equipaggiamento", title: "Equipaggiamento", text: "Armi, armature e altro", Icon: Backpack },
  { href: "/avanzamento", title: "Avanzamento di livello", text: "PE, bonus di competenza e punti ferita", Icon: TrendingUp },
  { href: "/oggetti-magici", title: "Oggetti magici", text: "Elenco A–Z con rarità e sintonia", Icon: Gem },
  { href: "/compendio/condizioni", title: "Condizioni", text: "Accecato, Avvelenato, Spaventato…", Icon: ShieldAlert },
];

function GroupLabel({ children }: { children: string }) {
  return <h2 className="mt-6 text-[12px] font-bold uppercase tracking-[0.08em] text-[#5E4E3E]">{children}</h2>;
}

export default function CompendiumPage() {
  return (
    <div className="px-4 pb-8 pt-8 sm:px-6">
      <h1 className="border-b-4 border-primary pb-3 font-serif text-[40px] font-bold leading-tight">Compendio</h1>
      <p className="mt-3 text-[15px] leading-6 text-muted">Regole, equipaggiamento e strumenti per il tavolo</p>
      <GroupLabel>Personaggi</GroupLabel>
      <SectionTiles tiles={CHARACTERS} label="Personaggi" className="mt-2.5" />
      <GroupLabel>Regole e oggetti</GroupLabel>
      <SectionTiles tiles={TILES} label="Regole e oggetti" className="mt-2.5" />
    </div>
  );
}
