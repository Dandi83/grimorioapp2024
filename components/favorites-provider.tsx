"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { renameFavoriteId } from "@/lib/monster-id-aliases";
import { favoriteCardsKept, fetchFavoriteCards, whenIdle } from "@/lib/favorite-cards";

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
    // 2014 sheets saved before their "-2014" address keep pointing at the same sheet.
    return [...new Set(value.filter((id): id is string => typeof id === "string").map(renameFavoriteId))];
  } catch {
    return null;
  }
}

/**
 * «I più salvati» (PROMPT 10): the star tells the statistics (components/analytics-provider.tsx), which send it only
 * for a counted browser. Only the kind and the id of the card: the list itself stays on the phone.
 */
function trackFavorite(id: string, added: boolean) {
  const creature = id.startsWith("mostro:");
  window.dispatchEvent(new window.CustomEvent("grimorio:analytics-event", {
    detail: { event: added ? "favorite_add" : "favorite_remove", kind: creature ? "mostro" : "incantesimo", id: creature ? id.slice(7) : id },
  }));
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

  // Preferiti offline (PROMPT 43): when the browser is idle, the rows of favorites the device does not keep yet are
  // asked once (lib/favorite-cards.ts); online on Preferiti they come anyway. No favorite, or offline: nothing.
  useEffect(() => {
    if (!loaded || !favorites.length || !navigator.onLine || window.location.pathname === "/preferiti" || favoriteCardsKept(favorites)) return;
    return whenIdle(() => { void fetchFavoriteCards(favorites); }, 8000);
  }, [favorites, loaded]);

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);
  const isFavorite = useCallback((id: string) => favoriteSet.has(id), [favoriteSet]);

  const latest = useRef(favorites);
  latest.current = favorites;
  const toggle = useCallback(
    (id: string) => {
      // Start from the latest saved list in case another tab changed it.
      const current = readStoredFavorites() ?? latest.current;
      const removed = current.includes(id);
      setFavorites(removed ? current.filter((f) => f !== id) : [...current, id]);
      trackFavorite(id, !removed);
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
