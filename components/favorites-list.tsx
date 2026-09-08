"use client";

import { Star } from "lucide-react";

import { useFavorites } from "@/components/favorites-provider";
import { SpellRow } from "@/components/spell-row";
import type { Spell } from "@/lib/spells";

export function FavoritesList({ spells }: { spells: Spell[] }) {
  const { favorites, loaded } = useFavorites();

  const favSpells = spells.filter((s) => favorites.includes(s.id));

  return (
    <div>
      <header className="border-b border-border px-6 pb-4 pt-6">
        <h1 className="font-serif text-3xl font-bold text-foreground">
          Preferiti
        </h1>
        <p className="mt-1 text-[13px] tracking-wide text-muted">
          {loaded
            ? `${favSpells.length} ${
                favSpells.length === 1
                  ? "incantesimo salvato"
                  : "incantesimi salvati"
              }`
            : "\u00A0"}
        </p>
      </header>

      {!loaded ? null : favSpells.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-8 py-24 text-center">
          <Star size={56} className="text-muted" />
          <p className="mt-2 font-serif text-xl font-semibold text-foreground">
            Il tuo grimorio è vuoto.
          </p>
          <p className="text-sm leading-5 text-muted text-pretty">
            Aggiungi i tuoi incantesimi preferiti per ritrovarli qui.
          </p>
        </div>
      ) : (
        <ul className="px-6 py-2">
          {favSpells.map((spell, i) => (
            <li key={spell.id}>
              {i > 0 && <div className="ml-[15px] h-px bg-divider" />}
              <SpellRow spell={spell} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
