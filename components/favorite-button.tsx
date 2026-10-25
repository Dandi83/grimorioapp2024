"use client";

import { Star } from "lucide-react";

import { useFavorites } from "@/components/favorites-provider";

export function FavoriteButton({ id, inline = false }: { id: string; inline?: boolean }) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(id);

  return (
    <button
      type="button"
      onClick={() => toggle(id)}
      aria-label={fav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
      aria-pressed={fav}
      className={inline
        ? "flex size-11 items-center justify-center text-primary transition-transform active:scale-90"
        : `absolute right-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border transition-transform active:scale-90 ${
          fav
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-elevated text-foreground"
        }`}
    >
      <Star size={inline ? 26 : 20} strokeWidth={inline ? 1.75 : 2} className={inline ? (fav ? "fill-primary" : "") : fav ? "fill-primary-foreground" : ""} />
    </button>
  );
}
