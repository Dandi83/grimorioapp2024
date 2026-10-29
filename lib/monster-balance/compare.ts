import type { BalanceMetrics } from "./simulate";

/** One SRD monster in the data file (scripts/build-monster-balance.mjs). */
export type ReferenceRow = {
  id: string; name: string; cr: number;
  damagePerRound: number; rounds: number; downPct: number; wipePct: number;
  ac: number; hp: number; toHit: number | null; dc: number | null;
};
export type Band = { median: number; low: number; high: number };
export type Verdict = "in linea" | "sopra" | "sotto";
export type MetricResult = { value: number; band: Band; percentile: number; verdict: Verdict };
export type Comparison = {
  group: ReferenceRow[];
  /** 0: the same CR; 1, 2…: CR ± that much, to reach at least 6 SRD monsters. */
  widened: number;
  damage: MetricResult;
  rounds: MetricResult;
  down: MetricResult;
  inLine: boolean;
  /** «Danni ai PG per round sopra la fascia (+35%)», empty when in line. */
  outside: string[];
  typical: { ac: number; hp: number; toHit: number | null; dc: number | null };
};

export const MIN_GROUP = 6;

/** The value at a fraction (0–1) of a sorted list, by linear interpolation. */
export function quantile(sorted: number[], fraction: number): number {
  if (!sorted.length) return 0;
  const position = (sorted.length - 1) * fraction, below = Math.floor(position), above = Math.ceil(position);
  return sorted[below] + (sorted[above] - sorted[below]) * (position - below);
}

export function band(values: number[]): Band {
  const sorted = [...values].sort((a, b) => a - b);
  const round1 = (value: number) => Math.round(value * 10) / 10;
  return { median: round1(quantile(sorted, 0.5)), low: round1(quantile(sorted, 0.25)), high: round1(quantile(sorted, 0.75)) };
}

/** The SRD monsters of the same CR; fewer than 6: CR ± 1, ± 2… */
export function referenceGroup(cr: number, rows: ReferenceRow[], ownId?: string): { group: ReferenceRow[]; widened: number } {
  const others = rows.filter(row => row.id !== ownId);
  for (let widened = 0; widened <= 30; widened++) {
    const group = others.filter(row => Math.abs(row.cr - cr) <= widened + 1e-9);
    if (group.length >= MIN_GROUP) return { group, widened };
  }
  return { group: others, widened: 30 };
}

function metric(value: number, values: number[]): MetricResult {
  const range = band(values);
  const percentile = values.length ? Math.round((values.filter(other => other <= value).length / values.length) * 100) : 0;
  const verdict: Verdict = value > range.high ? "sopra" : value < range.low ? "sotto" : "in linea";
  return { value, band: range, percentile, verdict };
}

const LABELS = { damage: "Danni ai PG per round", rounds: "Round che resiste" } as const;

/** How far a value is from its band, in % of the nearest edge. */
function distance(result: MetricResult): number {
  const edge = result.verdict === "sopra" ? result.band.high : result.band.low;
  if (result.verdict === "in linea") return 0;
  return edge ? Math.round(((result.value - edge) / edge) * 100) : 100;
}

export function compare(metrics: BalanceMetrics, cr: number, rows: ReferenceRow[], ownId?: string): Comparison {
  const { group, widened } = referenceGroup(cr, rows, ownId);
  const damage = metric(metrics.damagePerRound, group.map(row => row.damagePerRound));
  const rounds = metric(metrics.rounds, group.map(row => row.rounds));
  const down = metric(metrics.downPct, group.map(row => row.downPct));
  const outside = (["damage", "rounds"] as const).filter(key => ({ damage, rounds })[key].verdict !== "in linea").map(key => {
    const result = ({ damage, rounds })[key], gap = distance(result);
    return `${LABELS[key]} ${result.verdict} la fascia (${gap === 0 ? "di poco" : `${gap > 0 ? "+" : ""}${gap}%`})`;
  });
  const typical = (key: "ac" | "hp" | "toHit" | "dc") => {
    const values = group.map(row => row[key]).filter((value): value is number => typeof value === "number");
    return values.length ? Math.round(quantile([...values].sort((a, b) => a - b), 0.5)) : null;
  };
  return {
    group, widened, damage, rounds, down, inLine: !outside.length, outside,
    typical: { ac: typical("ac") ?? 0, hp: typical("hp") ?? 0, toHit: typical("toHit"), dc: typical("dc") },
  };
}

/** How far a monster is from its CR (for the list of /admin/bilanciamento): the largest gap of damage and rounds. */
export function gapFromCr(comparison: Comparison): number {
  return Math.max(...[comparison.damage, comparison.rounds].map(result => Math.abs(distance(result))));
}
