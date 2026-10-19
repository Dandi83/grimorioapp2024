"use client";

import Link from "next/link";
import { memo } from "react";
import { Star } from "lucide-react";

import { useIntentPrefetch } from "@/components/use-intent-prefetch";

import {
  gsLabel,
  monsterColor,
  typeCategory,
  type MonsterListItem,
} from "@/lib/monsters-types";

// Memoized like SpellRow: toggling one star re-renders only that row.
export const MonsterRow = memo(function MonsterRow({ monster, fav, onToggle }: {
  monster: MonsterListItem;
  fav: boolean;
  onToggle: (id: string) => void;
}) {
  const favId = `mostro:${monster.id}`;

  const href = `/mostro/${monster.id}`;
  const prefetch = useIntentPrefetch(href);

  return (
    <div className="flex items-center pr-4">
      <span
        className="mr-3 h-8 w-[3px] flex-shrink-0 rounded-r-sm"
        style={{ backgroundColor: monsterColor(monster.tipo) }}
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
            {monster.nome}
          </p>
        </div>
        <p className="truncate text-xs uppercase tracking-wide text-muted">
          {gsLabel(monster.grado_sfida)} · {monster.taglia}
          {typeCategory(monster.tipo) ? ` · ${typeCategory(monster.tipo)}` : ""}
        </p>
      </Link>
      <button
        type="button"
        onClick={() => onToggle(favId)}
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
