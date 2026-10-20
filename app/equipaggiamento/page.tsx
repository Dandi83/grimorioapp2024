import Link from "next/link";
import { ArrowRight, Swords } from "lucide-react";
import { weapons } from "@/lib/equipment";

export const metadata = { title: "Equipaggiamento — Il Grimorio.App" };

/** Hub of the Equipaggiamento section; tools, adventuring gear, mounts and magic items will join here. */
export default function EquipmentPage() {
  const sections = [
    { href: "/equipaggiamento/armi", title: "Armi", text: `${weapons.length} armi, 2014 e 2024 a confronto`, Icon: Swords },
  ];
  return (
    <div className="px-4 pb-8 pt-8 sm:px-6">
      <h1 className="border-b-4 border-primary pb-3 font-serif text-[40px] font-bold leading-tight">Equipaggiamento</h1>
      <p className="mt-3 text-[15px] leading-6 text-muted">Dati dell’SRD 5.1 (2014) e dell’SRD 5.2.1 (2024), con le differenze tra le edizioni.</p>
      <ul className="mt-5 grid gap-3">
        {sections.map(({ href, title, text, Icon }) => (
          <li key={href}>
            <Link href={href} className="flex min-h-24 items-center gap-4 rounded-[14px] border border-border bg-card p-4 shadow-[0_1px_0_var(--color-divider)]">
              <span className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-primary bg-primary-faint text-primary">
                <Icon size={28} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-serif text-[26px] font-bold leading-tight">{title}</span>
                <span className="block text-[15px] text-muted">{text}</span>
              </span>
              <ArrowRight size={20} className="shrink-0 text-primary" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
