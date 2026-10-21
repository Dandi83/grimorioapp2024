import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ComponentType } from "react";

export interface SectionTile {
  href: string;
  title: string;
  text: string;
  Icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  /** A new section: amber 2 px border and a «NUOVO» label. */
  nuovo?: boolean;
}

/** Large tiles of a hub page (Compendio, Equipaggiamento): one per available section, none "coming soon". */
export function SectionTiles({ tiles }: { tiles: SectionTile[] }) {
  return (
    <ul className="mt-5 grid gap-3">
      {tiles.map(({ href, title, text, Icon, nuovo }) => (
        <li key={href}>
          <Link href={href} className={`flex min-h-24 items-center gap-4 rounded-[14px] bg-card p-4 shadow-[0_1px_0_var(--color-divider)] ${nuovo ? "border-2 border-amber" : "border border-border"}`}>
            <span className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-primary bg-primary-faint text-primary">
              <Icon size={28} aria-hidden={true} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-serif text-[26px] font-bold leading-tight">{title}</span>
              <span className="block text-[15px] text-muted">{text}</span>
              {nuovo && <span className="mt-1.5 inline-block rounded-[10px] bg-amber px-2.5 py-0.5 text-[12px] font-bold tracking-[0.04em] text-foreground">NUOVO</span>}
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
