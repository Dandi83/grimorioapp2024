import type { ReactNode } from "react";

/** Icons of the twelve classes (viewBox 24, stroke only), approved by Daniele with the colours. */
const PATHS: Record<string, ReactNode> = {
  barbaro: <><path d="M5 20L15 6" /><path d="M12 4c4-1 8 2 7 7l-5-2z" /></>,
  bardo: <><path d="M9 18V5l10-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /></>,
  chierico: <><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" /></>,
  druido: <><path d="M5 19C5 10 11 4 20 4c0 9-6 15-15 15z" /><path d="M5 19L14 10" /></>,
  guerriero: <><path d="M19 3L9 13" /><path d="M15 3h4v4" /><path d="M6 12l6 6" /><path d="M8 16l-4 4" /></>,
  ladro: <><circle cx="8" cy="8" r="4" /><path d="M11 11l9 9M16 16l2-2M18 18l2-2" /></>,
  mago: <path d="M12 3l2.6 5.6L20 9.5l-4 4 1 6-5-3-5 3 1-6-4-4 5.4-.9z" />,
  monaco: <><circle cx="12" cy="12" r="9" /><path d="M12 3a4.5 4.5 0 0 1 0 9a4.5 4.5 0 0 0 0 9" /></>,
  paladino: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M12 8v8M9 11h6" /></>,
  ranger: <><path d="M7 3c6 3 6 15 0 18" /><path d="M7 3v18" /><path d="M3 12h17M17 9l3 3-3 3" /></>,
  stregone: <path d="M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4 2-7 2 1 3 3 3 5 1-3 0-6 1-9z" />,
  warlock: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
};

export function ClassIcon({ id, size = 24 }: { id: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[id]}
    </svg>
  );
}
