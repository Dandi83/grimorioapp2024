"use client";

import Link from "next/link";
import { Star } from "lucide-react";

import { useFavorites } from "@/components/favorites-provider";
import { capitalizeWords, type Spell } from "@/lib/spells-types";
import { schoolColor } from "@/lib/school-colors";

function metaLine(spell: Spell): string {
  if (spell.livello_num === 0) return `Trucchetto · ${spell.scuola}`;
  if (spell.livello_num === -1) return `? · ${spell.scuola || "?"}`;
  return `${spell.livello_num}° liv. · ${spell.scuola}`;
}

export function SpellRow({ spell }: { spell: Spell }) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(spell.id);

  return (
    <div className="flex items-center pr-4">
      <span
        className="mr-3 h-8 w-[3px] flex-shrink-0 rounded-r-sm"
        style={{ backgroundColor: schoolColor(spell.scuola) }}
      />
      <Link
        href={`/spell/${spell.id}`}
        className="min-w-0 flex-1 py-3 transition-opacity hover:opacity-70"
      >
        <p className="truncate font-serif text-lg font-semibold text-foreground">
          {capitalizeWords(spell.nome_italiano)}
        </p>
        <p className="truncate text-xs uppercase tracking-wide text-muted">
          {metaLine(spell)}
        </p>
      </Link>
      <button
        type="button"
        onClick={() => toggle(spell.id)}
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
}
