"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { Edition } from "@/lib/public-sections";
import { USER_EDITION_KEY, isEdition, storedEdition } from "@/lib/user-edition";

export interface UserEdition {
  /** The edition every public section starts from: 2024 until the device is read (server rendering, first paint). */
  edition: Edition;
  /** Chosen on this device (or adopted from the old per-section choices). */
  chosen: boolean;
  /** The device has been read. */
  ready: boolean;
  /** The only edition the public sees (the other one hidden from /admin/sezioni): no choice, no first launch. */
  forced?: Edition;
  /** The first launch screen is due: the visit started on the Home and nobody has chosen yet. */
  firstLaunch: boolean;
  /** Changes the edition of the whole app, on this device and in its other open tabs. */
  choose: (value: Edition) => void;
}

const EditionContext = createContext<UserEdition>({ edition: "2024", chosen: false, ready: false, firstLaunch: false, choose: () => undefined });

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(value: Edition): boolean {
  try {
    window.localStorage.setItem(USER_EDITION_KEY, value);
    return window.localStorage.getItem(USER_EDITION_KEY) === value;
  } catch {
    return false;
  }
}

/**
 * «La tua edizione», from the root layout: the single place the public sections read and change it.
 * The device is read after mount, so the pages rendered by the server (and saved offline) stay the same.
 * forced: from the hidden parts of /admin/sezioni (lib/user-edition.ts forcedEdition), for the public only.
 */
export function EditionProvider({ forced, children }: { forced?: Edition; children: ReactNode }) {
  const [state, setState] = useState<{ edition: Edition; chosen: boolean; ready: boolean; landedOnHome: boolean; canStore: boolean }>(
    { edition: "2024", chosen: false, ready: false, landedOnHome: false, canStore: false });

  useEffect(() => {
    const stored = storedEdition(read);
    // Adopted from the old keys: written once, so the old keys are never read again.
    const canStore = stored.migrated ? write(stored.edition) : (() => {
      try {
        const probe = "grimorio.edizione.prova";
        window.localStorage.setItem(probe, "1");
        window.localStorage.removeItem(probe);
        return true;
      } catch {
        return false;
      }
    })();
    // The first page of the visit: the first launch only ever covers the Home, never a direct link.
    const landedOnHome = window.location.pathname === "/" && !new URLSearchParams(window.location.search).has("cerca");
    setState({ edition: stored.edition, chosen: stored.chosen, ready: true, landedOnHome, canStore });

    // Another tab of the browser changed it.
    const sync = (event: StorageEvent) => {
      if (event.key === USER_EDITION_KEY && isEdition(event.newValue)) {
        const edition = event.newValue;
        setState(current => ({ ...current, edition, chosen: true }));
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const choose = useCallback((value: Edition) => {
    write(value);
    setState(current => ({ ...current, edition: value, chosen: true }));
  }, []);

  const value = useMemo<UserEdition>(() => ({
    edition: forced ?? state.edition,
    chosen: state.chosen,
    ready: state.ready,
    forced,
    firstLaunch: state.ready && !state.chosen && !forced && state.landedOnHome && state.canStore,
    choose,
  }), [forced, state, choose]);

  return <EditionContext.Provider value={value}>{children}</EditionContext.Provider>;
}

export function useUserEdition(): UserEdition {
  return useContext(EditionContext);
}
