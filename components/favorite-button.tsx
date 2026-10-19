"use client";

import { Star } from "lucide-react";

import { useFavorites } from "@/components/favorites-provider";

export function FavoriteButton({ id }: { id: string }) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(id);

  return (
    <button
      type="button"
      onClick={() => toggle(id)}
      aria-label={fav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
      aria-pressed={fav}
      className={`absolute right-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border transition-transform active:scale-90 ${
        fav
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-elevated text-foreground"
      }`}
    >
      <Star size={20} className={fav ? "fill-primary-foreground" : ""} />
    </button>
  );
}
