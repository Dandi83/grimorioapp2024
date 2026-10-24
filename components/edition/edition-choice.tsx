"use client";

import { forwardRef } from "react";

import type { Edition } from "@/lib/public-sections";

/** Colours of the two editions: bordeaux for 2024, blue for 2014 (pill, choices, first launch). */
export const EDITION_COLOR: Record<Edition, string> = { "2024": "#7A1F2B", "2014": "#2D4C7A" };

/**
 * A large choice of edition (about 96 px, radius 18 px) with only «D&D 2024» in EB Garamond, centred.
 * Full colour with light text on the first launch and, in the panel, when active; cream with a border
 * and the text in the colour of its edition when not.
 */
export const EditionChoice = forwardRef<HTMLButtonElement, {
  edition: Edition;
  onChoose: (edition: Edition) => void;
  /** Panel: the active choice (aria-pressed). Undefined on the first launch. */
  active?: boolean;
}>(function EditionChoice({ edition, onChoose, active }, ref) {
  const filled = active !== false;
  const color = EDITION_COLOR[edition];
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={active}
      onClick={() => onChoose(edition)}
      style={filled ? { backgroundColor: color, borderColor: color } : { borderColor: "var(--color-border)", color }}
      className={`flex min-h-24 w-full items-center justify-center rounded-[18px] border-2 px-5 py-3 font-serif text-[40px] font-bold leading-none tabular-nums transition-colors focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-amber ${filled ? "text-white shadow-[0_6px_18px_rgb(43_33_24_/_22%)]" : "bg-card"}`}
    >
      D&amp;D {edition}
    </button>
  );
});
