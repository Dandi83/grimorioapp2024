"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { CardDisplayContext } from "@/lib/card-display";

const Context = createContext<CardDisplayContext>({});

/**
 * For the previews (spell and creature editors, homebrew proposals): the spell catalog and the hidden pages
 * of the public site, so the preview links exactly what the public card will link. Set by the server page.
 */
export function CardDisplayProvider({ value, children }: { value: CardDisplayContext; children: ReactNode }) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCardDisplay(): CardDisplayContext {
  return useContext(Context);
}
