import type { ReactNode } from "react";

import { dayLabel } from "@/lib/analytics-stats";

// The four tiles of /admin/statistiche (canvas «Statistiche che contano», proposal A «Quattro tessere», PROMPT 16):
// drawn on the server as SVG, each chart with its numbers in words; the numbers stay real text.
const BORDEAUX = "#7A1F2B", AMBER = "#E0A21A", GREEN = "#1F6B45", TRACK = "#EDE3CC";

const number = (value: number) => value.toLocaleString("it-IT");

/** One tile: the label, the big number (with the arrow), a small chart, the line of detail. */
export function Tile({ name, label, value, valueColor, arrow, chart, detail, dark = false }: {
  name: string; label: string; value: string; valueColor: string; arrow?: ReactNode; chart: ReactNode; detail: ReactNode; dark?: boolean;
}) {
  return (
    <section aria-label={label} data-tile={name}
      className={`flex min-w-0 flex-col gap-2 rounded-[18px] p-[14px] ${dark ? "bg-[#2B2118] text-[#FFFBF0]" : "border border-[#DDCFAE] bg-[#FFFBF0] text-[#2B2118]"}`}>
      <h2 className={`truncate text-[12px] font-bold uppercase tracking-[0.1em] ${dark ? "text-[#E0A21A]" : "text-[#5E4E3E]"}`}>{label}</h2>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-serif text-[46px] font-bold leading-none" style={{ color: valueColor }} data-tile-value="">{value}</span>
        {arrow}
      </p>
      <div className="min-h-[38px]">{chart}</div>
      <p className={`text-[13px] leading-5 ${dark ? "text-[#EDE3CC]" : "text-[#5E4E3E]"}`} data-tile-detail="">{detail}</p>
    </section>
  );
}

/**
 * ▲/▼ and the difference with the period before, green when better, bordeaux when worse; nothing while there is no
 * period before to compare with (change null). unit: «%» for a change of people, « pt» for a change of a share.
 */
export function Arrow({ change, unit = "%", dark = false }: { change: number | null; unit?: string; dark?: boolean }) {
  if (change === null) return null;
  const up = change >= 0;
  const color = up ? (dark ? "#8FD3A8" : GREEN) : (dark ? "#F2A3AB" : BORDEAUX);
  const said = `${up ? "in aumento" : "in calo"} di ${Math.abs(change)} ${unit === "%" ? "per cento" : "punti"} rispetto al periodo prima`;
  return (
    <span className="text-[14px] font-bold tabular-nums" style={{ color }} data-arrow={up ? "su" : "giu"} aria-label={said}>
      <span aria-hidden="true">{up ? "▲" : "▼"} {Math.abs(change)}{unit}</span>
    </span>
  );
}

/** People per day as a small area (amber line, amber area at 25%). */
export function Sparkline({ days }: { days: { day: string; visitors: number }[] }) {
  const width = 160, height = 38;
  const max = Math.max(1, ...days.map(row => row.visitors));
  const x = (index: number) => (days.length > 1 ? (index * width) / (days.length - 1) : width / 2);
  const y = (value: number) => 3 + (height - 6) * (1 - value / max);
  const points = days.map((row, index) => `${x(index).toFixed(1)},${y(row.visitors).toFixed(1)}`);
  const label = days.length
    ? `Persone al giorno dal ${dayLabel(days[0].day)} al ${dayLabel(days[days.length - 1].day)}: ${days.map(row => row.visitors).join(", ")}.`
    : "Nessun dato nel periodo.";
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} data-chart="persone" preserveAspectRatio="none" className="block h-[38px] w-full">
      {points.length > 1 && <path d={`M0,${height} L${points.join(" L")} L${width},${height} Z`} fill={AMBER} fillOpacity="0.25" />}
      {points.length > 1 && <polyline points={points.join(" ")} fill="none" stroke={AMBER} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

/** A small ring (38 px): track #EDE3CC, arc bordeaux. */
export function SmallRing({ percent, label }: { percent: number; label: string }) {
  const radius = 15, length = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 38 38" role="img" aria-label={label} data-chart="anello" className="h-[38px] w-[38px] shrink-0">
      <circle cx="19" cy="19" r={radius} fill="none" stroke={TRACK} strokeWidth="5" />
      <circle cx="19" cy="19" r={radius} fill="none" stroke={BORDEAUX} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={`${(length * Math.min(100, Math.max(0, percent))) / 100} ${length}`} transform="rotate(-90 19 19)" />
    </svg>
  );
}

/** A bar split in parts (each with its colour), in proportion to their values; empty: the track alone. */
export function SplitBar({ parts, label, name }: { parts: { value: number; color: string }[]; label: string; name: string }) {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  return (
    <div role="img" aria-label={label} data-chart={name} className="flex h-3 w-full overflow-hidden rounded-full bg-[#EDE3CC]">
      {total > 0 && parts.filter(part => part.value > 0).map((part, index) => (
        <span key={index} className="h-full" style={{ width: `${(part.value / total) * 100}%`, backgroundColor: part.color }} />
      ))}
    </div>
  );
}

export { number as tileNumber };
