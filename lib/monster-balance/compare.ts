import { STRESS, type Measures, type StressKey } from "./scenarios";
import { TACTICS, type BalanceMetrics, type Tactic } from "./simulate";

/** The test situations of an SRD monster: what the warnings compare. */
export type StressRow = Pick<BalanceMetrics, "rounds" | "wipePct" | "winPct">;
/** One SRD monster in the data file (scripts/build-monster-balance.mjs): each tactic in the base, each test situation. */
export type ReferenceRow = {
  id: string; name: string; cr: number;
  ac: number; hp: number; toHit: number | null; dc: number | null;
  tactics: Record<Tactic, BalanceMetrics>;
  stress: Record<StressKey, StressRow>;
};
export type Band = { median: number; low: number; high: number };
export type Verdict = "in linea" | "sopra" | "sotto";
export type MetricResult = { value: number; band: Band; percentile: number; verdict: Verdict };
/** The verdict: both measures in the band; one out by 25% at most; both out, or one out by more. */
export type Level = "in linea" | "da controllare" | "fuori";
export type TacticResult = {
  tactic: Tactic; damage: MetricResult; rounds: MetricResult; down: MetricResult; level: Level;
  /** «picchia troppo forte (+35%)», empty when in line. */
  outside: string[];
  /** The largest distance from the band of damage and rounds, in %. */
  gap: number;
};
export type StressResult = { key: StressKey; label: string; metrics: StressRow; warnings: string[] };
export type Comparison = {
  group: ReferenceRow[];
  /** 0: the same CR; 1, 2…: CR ± that much, to reach at least 6 SRD monsters. */
  widened: number;
  tactics: Record<Tactic, TacticResult>;
  /** The worst of the three tactics. */
  level: Level;
  /** The tactic the sentence speaks of (null when all three are in line). */
  worst: Tactic | null;
  sentence: string;
  stress: StressResult[];
  typical: { ac: number; hp: number; toHit: number | null; dc: number | null };
};

export const MIN_GROUP = 6;
/** The band: from the 10th to the 90th percentile of the group (8 official monsters out of 10). */
export const BAND = { low: 0.1, high: 0.9 } as const;
/** Beyond this distance from the edge of the band (in %), one measure out is enough for «Fuori dal GS». */
export const CHECK_LIMIT = 25;

export const TACTIC_LABEL: Record<Tactic, string> = { ottimale: "Ottimale", caso: "A caso", prudente: "Prudente" };
/** Who plays the monster, at the start of the sentence of the verdict. */
export const TACTIC_WHO: Record<Tactic, string> = {
  ottimale: "Con un master che gioca al meglio", caso: "Con un master che sceglie a caso", prudente: "Con un master prudente",
};

/** The value at a fraction (0–1) of a sorted list, by linear interpolation. */
export function quantile(sorted: number[], fraction: number): number {
  if (!sorted.length) return 0;
  const position = (sorted.length - 1) * fraction, below = Math.floor(position), above = Math.ceil(position);
  return sorted[below] + (sorted[above] - sorted[below]) * (position - below);
}

export function band(values: number[]): Band {
  const sorted = [...values].sort((a, b) => a - b);
  const round1 = (value: number) => Math.round(value * 10) / 10;
  return { median: round1(quantile(sorted, 0.5)), low: round1(quantile(sorted, BAND.low)), high: round1(quantile(sorted, BAND.high)) };
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

export function metric(value: number, values: number[]): MetricResult {
  const range = band(values);
  const percentile = values.length ? Math.round((values.filter(other => other <= value).length / values.length) * 100) : 0;
  const verdict: Verdict = value > range.high ? "sopra" : value < range.low ? "sotto" : "in linea";
  return { value, band: range, percentile, verdict };
}

/** What a measure out of the band says about the monster. */
const PHRASES = {
  damage: { sopra: "picchia troppo forte", sotto: "picchia troppo piano" },
  rounds: { sopra: "resiste troppo a lungo", sotto: "cade troppo presto" },
} as const;

/** How far a value is from its band, in % of the nearest edge (not rounded: the 25% limit is exact). */
export function distance(result: MetricResult): number {
  if (result.verdict === "in linea") return 0;
  const edge = result.verdict === "sopra" ? result.band.high : result.band.low;
  return edge ? ((result.value - edge) / edge) * 100 : 100;
}

/** The verdict of one tactic from the two measures that decide it, damage and rounds. */
export function levelOf(damage: MetricResult, rounds: MetricResult): Level {
  const out = [damage, rounds].filter(result => result.verdict !== "in linea");
  if (!out.length) return "in linea";
  if (out.length === 1 && Math.abs(distance(out[0])) <= CHECK_LIMIT) return "da controllare";
  return "fuori";
}

const percent = (gap: number) => (Math.round(gap) === 0 ? "di poco" : `${gap > 0 ? "+" : "−"}${Math.abs(Math.round(gap))}%`);
const RANK: Record<Level, number> = { "in linea": 0, "da controllare": 1, fuori: 2 };

/** One tactic of the monster against the same tactic of the SRD monsters of the group. */
export function compareTactic(tactic: Tactic, metrics: BalanceMetrics, group: ReferenceRow[]): TacticResult {
  const values = (key: "damagePerRound" | "rounds" | "downPct") => group.map(row => row.tactics[tactic][key]);
  const damage = metric(metrics.damagePerRound, values("damagePerRound"));
  const rounds = metric(metrics.rounds, values("rounds"));
  const down = metric(metrics.downPct, values("downPct"));
  const outside = (["damage", "rounds"] as const).flatMap(key => {
    const result = ({ damage, rounds })[key];
    return result.verdict === "in linea" ? [] : [`${PHRASES[key][result.verdict]} (${percent(distance(result))})`];
  });
  const gap = Math.round(Math.max(...[damage, rounds].map(result => Math.abs(distance(result)))));
  return { tactic, damage, rounds, down, level: levelOf(damage, rounds), outside, gap };
}

const number = (value: number) => value.toLocaleString("it-IT", { maximumFractionDigits: 1 });

/** A test situation against the SRD monsters of the group in the same situation: the warnings, and the data. */
export function compareStress(key: StressKey, metrics: StressRow, group: ReferenceRow[]): StressResult {
  const scenario = STRESS.find(item => item.key === key)!;
  const values = (field: keyof StressRow) => [...group.map(row => row.stress[key][field])].sort((a, b) => a - b);
  const wipeHigh = quantile(values("wipePct"), BAND.high), roundsHigh = quantile(values("rounds"), BAND.high), winLow = quantile(values("winPct"), BAND.low);
  const warnings: string[] = [];
  if (metrics.wipePct > wipeHigh) warnings.push(`gruppo sterminato nel ${metrics.wipePct}% dei combattimenti (mostri SRD: fino al ${number(Math.round(wipeHigh * 10) / 10)}%)`);
  if (metrics.rounds > roundsHigh) warnings.push(`resiste ${number(metrics.rounds)} round (mostri SRD: fino a ${number(Math.round(roundsHigh * 10) / 10)})`);
  if (metrics.winPct < winLow) warnings.push(`i PG vincono solo nel ${metrics.winPct}% (mostri SRD: almeno il ${number(Math.round(winLow * 10) / 10)}%)`);
  return { key, label: scenario.label, metrics, warnings };
}

export function compare(measures: Measures, cr: number, rows: ReferenceRow[], ownId?: string): Comparison {
  const { group, widened } = referenceGroup(cr, rows, ownId);
  const tactics = Object.fromEntries(TACTICS.map(tactic => [tactic, compareTactic(tactic, measures.tactics[tactic], group)])) as Record<Tactic, TacticResult>;
  // The verdict of the worst tactic; between two of the same level, the one further from its band.
  const worstResult = TACTICS.map(tactic => tactics[tactic]).reduce((top, result) =>
    (RANK[result.level] > RANK[top.level] || (RANK[result.level] === RANK[top.level] && result.gap > top.gap) ? result : top));
  const level = worstResult.level;
  const worst = level === "in linea" ? null : worstResult.tactic;
  const sentence = worst
    ? `${TACTIC_WHO[worst]} ${worstResult.outside.join(" e ")}.`
    : "Danni e resistenza nella fascia dei mostri del suo GS con tutti e tre i modi di giocarlo.";
  const typical = (key: "ac" | "hp" | "toHit" | "dc") => {
    const values = group.map(row => row[key]).filter((value): value is number => typeof value === "number");
    return values.length ? Math.round(quantile([...values].sort((a, b) => a - b), 0.5)) : null;
  };
  return {
    group, widened, tactics, level, worst, sentence,
    stress: STRESS.map(scenario => compareStress(scenario.key, measures.stress[scenario.key], group)),
    typical: { ac: typical("ac") ?? 0, hp: typical("hp") ?? 0, toHit: typical("toHit"), dc: typical("dc") },
  };
}

/** How far a monster is from its CR (for the list of /admin/bilanciamento): the largest gap of the three tactics. */
export function gapFromCr(comparison: Comparison): number {
  return Math.max(...TACTICS.map(tactic => comparison.tactics[tactic].gap));
}
