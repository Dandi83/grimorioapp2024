"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

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

/**
 * The edition a section page shows, which an address can set apart from the user's one
 * (/spell/…-2014, ?edizione=2014): the pills (page and computer column) show it and choose through the page.
 * editions: those the page offers (an edition hidden from /admin/sezioni only to the administrator, labelled).
 */
export interface PageEdition {
  section: string;
  shown: Edition;
  editions: { value: Edition; hidden: boolean }[];
  choose: (value: Edition) => void;
}

const PageEditionContext = createContext<{ page?: PageEdition; setPage: (page: PageEdition | undefined) => void }>({ setPage: () => undefined });

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

  // Said to screen readers after a choice: the panels close at once, so the line lives here, on every page.
  const [said, setSaid] = useState("");
  const choose = useCallback((value: Edition) => {
    write(value);
    setState(current => ({ ...current, edition: value, chosen: true }));
    setSaid(`Ora tutta l’app parte dal ${value}.`);
  }, []);

  const value = useMemo<UserEdition>(() => ({
    edition: forced ?? state.edition,
    chosen: state.chosen,
    ready: state.ready,
    forced,
    firstLaunch: state.ready && !state.chosen && !forced && state.landedOnHome && state.canStore,
    choose,
  }), [forced, state, choose]);

  const [page, setPage] = useState<PageEdition>();
  const pageValue = useMemo(() => ({ page, setPage }), [page]);

  return (
    <EditionContext.Provider value={value}>
      <PageEditionContext.Provider value={pageValue}>{children}</PageEditionContext.Provider>
      <p role="status" aria-live="polite" data-testid="edition-status" className="sr-only">{said}</p>
    </EditionContext.Provider>
  );
}

export function useUserEdition(): UserEdition {
  return useContext(EditionContext);
}

/** The edition of the section page on screen, if any (for the pill of the computer column). */
export function usePageEdition(): PageEdition | undefined {
  return useContext(PageEditionContext).page;
}

/** A section page tells the pills which edition it shows and how to change it, while it is on screen. */
export function useRegisterPageEdition(page: PageEdition | undefined) {
  const { setPage } = useContext(PageEditionContext);
  const choose = useRef(page?.choose);
  useEffect(() => { choose.current = page?.choose; });
  const section = page?.section;
  const shown = page?.shown;
  const editions = JSON.stringify(page?.editions ?? null);
  useEffect(() => {
    if (section === undefined || shown === undefined) return;
    setPage({ section, shown, editions: JSON.parse(editions), choose: value => choose.current?.(value) });
    return () => setPage(undefined);
  }, [section, shown, editions, setPage]);
}
