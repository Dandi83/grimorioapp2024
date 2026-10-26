import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ComponentType } from "react";

import { IntentLink } from "@/components/intent-link";

export interface SectionTile {
  href: string;
  title: string;
  text: string;
  Icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  /** White icon on a 36 px bordeaux square (Personaggi), instead of the round badge. */
  square?: boolean;
  /** Hidden from the public (/admin/sezioni): shown only to the administrator, with the «Nascosta» label. */
  hidden?: boolean;
}

/** Large tiles of a hub page (Compendio, Equipaggiamento): one per available section, none "coming soon"; each page is prepared on touch or hover. */
export function SectionTiles({ tiles, label, className = "mt-5" }: { tiles: SectionTile[]; label?: string; className?: string }) {
  return (
    <ul className={`${className} grid gap-3 md:grid-cols-3 md:gap-4`} aria-label={label}>
      {tiles.map(({ href, title, text, Icon, square, hidden }) => (
        <li key={href}>
          <IntentLink href={href} className="flex min-h-24 items-center gap-4 rounded-[14px] border border-border bg-card p-4 shadow-[0_1px_0_var(--color-divider)] md:h-full md:min-h-[150px] md:flex-col md:items-start md:gap-3 md:rounded-2xl md:p-5 md:focus-visible:outline-2 md:focus-visible:outline-offset-2 md:focus-visible:outline-primary">
            {square ? (
              <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary text-white">
                <Icon size={20} aria-hidden={true} />
              </span>
            ) : (
              <span className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-primary bg-primary-faint text-primary">
                <Icon size={28} aria-hidden={true} />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block font-serif text-[26px] font-bold leading-tight md:text-[24px] md:text-primary">{title}</span>
              {hidden && <span className="mt-1 inline-block rounded-[6px] bg-[#2B2118] px-2 py-0.5 text-[12px] font-bold text-amber">Nascosta</span>}
              <span className="block text-[15px] text-muted">{text}</span>
            </span>
            <ArrowRight size={20} className="shrink-0 text-primary md:self-end" aria-hidden="true" />
          </IntentLink>
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
