import type { MagicItemRarityChip } from "@/lib/magic-items-types";

// Rarity in the palette, rising from parchment to bordeaux and amber; amber is a fill, never text.
const STYLE: Record<MagicItemRarityChip, string> = {
  Comune: "border-border bg-elevated text-foreground",
  "Non comune": "border-muted bg-card text-foreground",
  Raro: "border-chip-border bg-primary-faint text-primary",
  "Molto raro": "border-primary bg-primary text-primary-foreground",
  Leggendario: "border-amber bg-amber text-foreground",
  Variabile: "border-dashed border-primary bg-card text-primary",
  Manufatto: "border-foreground bg-foreground text-background",
};

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * The printed rarity ("Rara", "Rarità variabile") on the colour of its rarity; an item printed with
 * several rarities shows the first and the last ("Non comune – Molto rara").
 */
export function RarityChip({ printed, categories, full = false }: { printed: string; categories: MagicItemRarityChip[]; full?: boolean }) {
  const words = printed.match(/non comune|molto rar[oa]|leggendari[oa]|comune|rar[oa]/g) ?? [];
  const [head, ...rest] = words;
  const label = full || categories.length < 2 || !head || !rest.length ? capital(printed) : `${capital(head)} – ${rest.at(-1)}`;
  const first = categories[0] ?? "Variabile", last = categories[categories.length - 1] ?? first;
  return (
    <span className={`inline-flex min-h-7 items-center rounded-[6px] border px-2 text-[13px] font-bold leading-tight ${STYLE[last]}`}
      data-rarity={first === last ? first : `${first}–${last}`}>
      {label}
    </span>
  );
}
