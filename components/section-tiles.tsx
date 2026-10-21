import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ComponentType } from "react";

export interface SectionTile {
  href: string;
  title: string;
  text: string;
  Icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
}

/** Large tiles of a hub page (Compendio, Equipaggiamento): one per available section, none "coming soon". */
export function SectionTiles({ tiles }: { tiles: SectionTile[] }) {
  return (
    <ul className="mt-5 grid gap-3">
      {tiles.map(({ href, title, text, Icon }) => (
        <li key={href}>
          <Link href={href} className="flex min-h-24 items-center gap-4 rounded-[14px] border border-border bg-card p-4 shadow-[0_1px_0_var(--color-divider)]">
            <span className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-primary bg-primary-faint text-primary">
              <Icon size={28} aria-hidden={true} />
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
  );
}

/** "‹ Compendio" at the top of a section page: always the parent page, not the browser history. */
export function ParentLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 px-2 text-base font-bold text-primary">
      <span aria-hidden="true" className="text-xl leading-none">‹</span>
      <span>{label}</span>
    </Link>
  );
}
