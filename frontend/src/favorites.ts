import { useCallback, useEffect, useState } from "react";

import { storage } from "@/src/utils/storage";

const KEY = "grimorio.favorites.v1";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await storage.getItem<string[]>(KEY, []);
      setFavorites(stored ?? []);
      setLoaded(true);
    })();
  }, []);

  const persist = useCallback(async (next: string[]) => {
    setFavorites(next);
    await storage.setItem(KEY, next);
  }, []);

  const toggle = useCallback(
    async (id: string) => {
      const next = favorites.includes(id)
        ? favorites.filter((f) => f !== id)
        : [...favorites, id];
      await persist(next);
    },
    [favorites, persist],
  );

  const isFavorite = useCallback(
    (id: string) => favorites.includes(id),
    [favorites],
  );

  return { favorites, isFavorite, toggle, loaded };
}
