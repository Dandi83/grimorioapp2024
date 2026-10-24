"use client";

import { forwardRef } from "react";
import { ArrowRight, Check } from "lucide-react";

import type { Edition } from "@/lib/public-sections";

/** Colours of the two editions: bordeaux for 2024, blue for 2014 (pill, choices, first launch). */
export const EDITION_COLOR: Record<Edition, string> = { "2024": "#7A1F2B", "2014": "#2D4C7A" };

const TEXT: Record<Edition, { title: string; line: string }> = {
  "2024": { title: "Regole 2024", line: "Le regole aggiornate del 2024" },
  "2014": { title: "Quinta edizione classica", line: "Le regole del 2014" },
};

/**
 * A large choice of edition (about 104 px, radius 18 px): «2024» in EB Garamond, title and line.
 * Full colour with an arrow (first launch) or, in the panel, full with a tick when active and light
 * with a border when not.
 */
export const EditionChoice = forwardRef<HTMLButtonElement, {
  edition: Edition;
  onChoose: (edition: Edition) => void;
  /** Panel: the active choice (aria-pressed). Undefined on the first launch. */
  active?: boolean;
  /** The small box of the computer: a smaller number. */
  compact?: boolean;
}>(function EditionChoice({ edition, onChoose, active, compact }, ref) {
  const filled = active !== false;
  const color = EDITION_COLOR[edition];
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={active}
      onClick={() => onChoose(edition)}
      style={filled ? { backgroundColor: color, borderColor: color } : { borderColor: "var(--color-border)" }}
      className={`flex w-full items-center rounded-[18px] border-2 py-3 ${compact ? "min-h-[88px] gap-3 px-4" : "min-h-[104px] gap-4 px-5"} text-left transition-colors focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-amber ${filled ? "text-white shadow-[0_6px_18px_rgb(43_33_24_/_22%)]" : "bg-card text-foreground"}`}
    >
      <span className={`font-serif font-semibold leading-none tabular-nums ${compact ? "text-[36px]" : "text-[44px]"}`} style={filled ? undefined : { color }}>{edition}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[18px] font-bold leading-tight">{TEXT[edition].title}</span>
        <span className={`mt-0.5 block text-[15px] leading-snug ${filled ? "text-white/85" : "text-muted"}`}>{TEXT[edition].line}</span>
      </span>
      {active === undefined
        ? <ArrowRight size={24} strokeWidth={2.2} aria-hidden="true" className="shrink-0" />
        : active && <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/20"><Check size={20} strokeWidth={3} aria-hidden="true" /></span>}
    </button>
  );
});
