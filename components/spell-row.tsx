"use client";

import Link from "next/link";
import { memo } from "react";
import { Star } from "lucide-react";

import { useIntentPrefetch } from "@/components/use-intent-prefetch";

import type { SpellListItem } from "@/lib/spells-types";
import { spellName } from "@/lib/spell-name";
import { schoolColor } from "@/lib/school-colors";

function metaLine(spell: SpellListItem): string {
  if (spell.livello_num === 0) return `Trucchetto · ${spell.scuola}`;
  if (spell.livello_num === -1) return `? · ${spell.scuola || "?"}`;
  return `${spell.livello_num}° liv. · ${spell.scuola}`;
}

export const SpellRow = memo(function SpellRow({ spell, fav, onToggle }: {
  spell: SpellListItem;
  fav: boolean;
  onToggle: (id: string) => void;
}) {

  const href = `/spell/${spell.id}`;
  const prefetch = useIntentPrefetch(href);

  return (
    <div className="flex items-center pr-4">
      <span
        className="mr-3 h-8 w-[3px] flex-shrink-0 rounded-r-sm"
        style={{ backgroundColor: schoolColor(spell.scuola) }}
      />
      <Link
        href={href}
        prefetch={false}
        onTouchStart={prefetch}
        onMouseEnter={prefetch}
        className="min-w-0 flex-1 py-3 transition-opacity hover:opacity-70"
      >
        <div className="flex min-w-0 items-center gap-2">
          <p className="min-w-0 truncate font-serif text-lg font-semibold text-foreground">
            {spellName(spell.nome_italiano, spell.edizione)}
          </p>
        </div>
        <p className="truncate text-xs uppercase tracking-wide text-muted">
          {metaLine(spell)}
        </p>
      </Link>
      <button
        type="button"
        onClick={() => onToggle(spell.id)}
        aria-label={fav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
        aria-pressed={fav}
        className="p-2 transition-transform active:scale-90"
      >
        <Star
          size={22}
          className={fav ? "fill-primary text-primary" : "text-muted"}
        />
      </button>
    </div>
  );
});
