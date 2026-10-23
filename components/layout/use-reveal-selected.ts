"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * The list column of the computer layout: when a card opens (also from a direct link), the highlighted
 * row is brought into view, only if it is not already visible, so a click on a row in view never moves
 * the list. Rows rendered later (another edition, more pages) are waited for.
 */
export function useRevealSelected(root: RefObject<HTMLElement | null>, selectedId: string | undefined) {
  const pending = useRef<string | undefined>(undefined);
  const last = useRef<string | undefined>(undefined);
  if (selectedId !== last.current) {
    last.current = selectedId;
    pending.current = selectedId;
  }
  useEffect(() => {
    if (!pending.current || !root.current) return;
    const link = root.current.querySelector<HTMLElement>('a[aria-current="page"]');
    if (!link) return;
    pending.current = undefined;
    const row = link.closest("li") ?? link;
    const column = root.current.closest("aside");
    if (!column) return;
    const box = row.getBoundingClientRect(), view = column.getBoundingClientRect();
    if (box.top >= view.top && box.bottom <= view.bottom) return;
    row.scrollIntoView({ block: "center" });
  });
}
