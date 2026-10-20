import type { ArmorChip } from "@/lib/equipment-types";

/** Shield-shaped badge with the Armor Class: "11" over "+ Des", "16" over "fissa", "+2" over "alla CA". */
export function ArmorBadge({ ca, note, size = "list" }: { ca: string; note: string; size?: "list" | "sheet" }) {
  const big = size === "sheet";
  return (
    <span className={`relative grid shrink-0 place-items-center ${big ? "h-[150px] w-[132px]" : "h-[62px] w-[54px]"}`}>
      <svg viewBox="0 0 54 62" className="absolute inset-0 size-full" aria-hidden="true">
        <path d="M27 2 L51 9 V30 C51 45 40 55 27 60 C14 55 3 45 3 30 V9 Z" fill="var(--color-primary-faint)" stroke="var(--color-primary)" strokeWidth={big ? 1.4 : 2} />
      </svg>
      <span className={`relative flex flex-col items-center leading-none ${big ? "-mt-3" : "-mt-1"}`}>
        <span className={`font-serif font-bold text-primary ${big ? "text-[52px]" : "text-[24px]"}`}>{ca}</span>
        <span className={`font-semibold text-muted ${big ? "mt-1 text-sm" : "text-[11px]"}`}>{note}</span>
      </span>
    </span>
  );
}

const CHIP_STYLE: Record<ArmorChip["kind"], string> = {
  dex: "border-chip-border bg-card text-primary",
  proficiency: "border-chip-border bg-card text-primary",
  stealth: "border-foreground bg-foreground text-card",
  strength: "border-amber bg-[#FBEBC2] text-foreground",
  fixed: "border-[#CDBB96] bg-[#E9DDC2] text-foreground",
};

export function ArmorChips({ chips }: { chips: ArmorChip[] }) {
  if (!chips.length) return null;
  return (
    <span className="flex flex-wrap gap-1.5">
      {chips.map(chip => (
        <span key={chip.label} className={`rounded-full border px-2.5 py-0.5 text-[13px] font-semibold ${CHIP_STYLE[chip.kind]}`}>{chip.label}</span>
      ))}
    </span>
  );
}
