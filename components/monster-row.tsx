"use client";

import Link from "next/link";
import { memo } from "react";
import { Star } from "lucide-react";

import { HiddenTag } from "@/components/sections/hidden-tag";
import { useIntentPrefetch } from "@/components/use-intent-prefetch";

import {
  gsLabel,
  monsterColor,
  typeCategory,
  type MonsterListItem,
} from "@/lib/monsters-types";

// Memoized like SpellRow: toggling one star re-renders only that row.
export const MonsterRow = memo(function MonsterRow({ monster, fav, onToggle, unavailable = false }: {
  monster: MonsterListItem;
  fav: boolean;
  onToggle: (id: string) => void;
  /** Preferiti: a card hidden from the public stays in the list, dimmed and without its link, until it is shown again. */
  unavailable?: boolean;
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
      {unavailable && monster.nascosta ? (
        <div className="min-w-0 flex-1 py-3 opacity-60">
          <p className="min-w-0 truncate font-serif text-lg font-semibold text-foreground">{monster.nome}</p>
          <p className="text-xs tracking-wide text-muted">Non disponibile al momento</p>
        </div>
      ) : (
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
          {monster.nascosta && <HiddenTag className="shrink-0" />}
        </div>
        <p className="truncate text-xs uppercase tracking-wide text-muted">
          {gsLabel(monster.grado_sfida)} · {monster.taglia}
          {typeCategory(monster.tipo) ? ` · ${typeCategory(monster.tipo)}` : ""}
        </p>
      </Link>
      )}
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
