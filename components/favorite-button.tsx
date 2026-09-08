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
      className="fixed bottom-28 left-1/2 z-40 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-primary shadow-lg shadow-black/50 transition-transform active:scale-95 sm:left-auto sm:right-[max(1.5rem,calc(50%-336px+1.5rem))] sm:translate-x-0"
    >
      <Star
        size={24}
        className={
          fav ? "fill-primary-foreground text-primary-foreground" : "text-primary-foreground"
        }
      />
    </button>
  );
}
