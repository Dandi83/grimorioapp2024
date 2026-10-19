"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const KEY = "grimorio.favorites.v1";

interface FavoritesContextValue {
  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggle: (id: string) => void;
  loaded: boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

/** Only a list of IDs is valid: anything else in storage is ignored, never fatal. */
function parseFavorites(raw: string | null): string[] | null {
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return null;
    return [...new Set(value.filter((id): id is string => typeof id === "string"))];
  } catch {
    return null;
  }
}

function readStoredFavorites(): string[] | null {
  try {
    return parseFavorites(window.localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = readStoredFavorites();
    if (stored) setFavorites(stored);
    setLoaded(true);
    // Another tab saved its favorites: adopt them so the next save keeps both.
    const sync = (event: StorageEvent) => {
      if (event.key !== KEY) return;
      setFavorites(parseFavorites(event.newValue) ?? []);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(favorites));
    } catch {
      // ignore unavailable storage
    }
  }, [favorites, loaded]);

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);
  const isFavorite = useCallback((id: string) => favoriteSet.has(id), [favoriteSet]);

  const toggle = useCallback(
    (id: string) => {
      setFavorites((prev) => {
        // Start from the latest saved list in case another tab changed it.
        const current = readStoredFavorites() ?? prev;
        return current.includes(id)
          ? current.filter((f) => f !== id)
          : [...current, id];
      });
    },
    [],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favorites,
      isFavorite,
      toggle,
      loaded,
    }),
    [favorites, isFavorite, toggle, loaded],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return ctx;
}
