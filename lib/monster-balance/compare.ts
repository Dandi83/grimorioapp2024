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
/** The verdict (PROMPT 26): see verdictOf. */
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
  /** The verdict of the six measures (verdictOf). */
  level: Level;
  /** Measures out of the band, of six; of them, out by more than FAR_LIMIT. */
  out: number; far: number;
  /** The tactic the sentence speaks of (null when all three are in line). */
  worst: Tactic | null;
  sentence: string;
  stress: StressResult[];
  typical: { ac: number; hp: number; toHit: number | null; dc: number | null };
};

export const MIN_GROUP = 6;
/**
 * The band (PROMPT 26): from the 5th to the 95th percentile of the group (9 official monsters out of 10), for the six
 * measures of the verdict, the test situations and the warnings.
 */
export const BAND = { low: 0.05, high: 0.95 } as const;
/**
 * The verdict, calibrated on the SRD monsters (each against its group without itself, docs/metodo-bilanciamento.md):
 * six measures, damage and rounds for each of the three tactics. «In linea»: at most MAX_OUT out of the band; «Fuori
 * dal GS»: at least FAR_COUNT out by more than FAR_LIMIT %; «Da controllare» the rest.
 */
export const MAX_OUT = 2;
export const FAR_LIMIT = 50;
export const FAR_COUNT = 2;

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

const isFar = (result: MetricResult) => result.verdict !== "in linea" && Math.abs(distance(result)) > FAR_LIMIT;

/** The verdict of measures (six for a monster, two for one tactic): how many are out of the band, how many far out. */
export function verdictOf(measures: MetricResult[]): { level: Level; out: number; far: number } {
  const out = measures.filter(result => result.verdict !== "in linea").length, far = measures.filter(isFar).length;
  return { level: far >= FAR_COUNT ? "fuori" : out <= MAX_OUT ? "in linea" : "da controllare", out, far };
}

/** One tactic, for the table of the box: in line with both measures in the band; out with one far out; to check otherwise. */
export function levelOf(damage: MetricResult, rounds: MetricResult): Level {
  const out = [damage, rounds].filter(result => result.verdict !== "in linea");
  if (!out.length) return "in linea";
  return out.some(isFar) ? "fuori" : "da controllare";
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
  const { level, out, far } = verdictOf(TACTICS.flatMap(tactic => [tactics[tactic].damage, tactics[tactic].rounds]));
  // The sentence speaks of the worst tactic: the higher level, then the one further from its band.
  const worstResult = TACTICS.map(tactic => tactics[tactic]).reduce((top, result) =>
    (RANK[result.level] > RANK[top.level] || (RANK[result.level] === RANK[top.level] && result.gap > top.gap) ? result : top));
  const worst = out ? worstResult.tactic : null;
  const margin = `al massimo ${MAX_OUT} misure su 6 fuori fascia, come i mostri ufficiali`;
  const sentence = !worst
    ? "Danni e resistenza nella fascia dei mostri del suo GS con tutti e tre i modi di giocarlo."
    : level === "in linea"
      ? `${TACTIC_WHO[worst]} ${worstResult.outside.join(" e ")}: entro il margine (${margin}).`
      : `${TACTIC_WHO[worst]} ${worstResult.outside.join(" e ")} (${out} misure su 6 fuori fascia${far ? `, ${far} di oltre il ${FAR_LIMIT}%` : ""}).`;
  const typical = (key: "ac" | "hp" | "toHit" | "dc") => {
    const values = group.map(row => row[key]).filter((value): value is number => typeof value === "number");
    return values.length ? Math.round(quantile([...values].sort((a, b) => a - b), 0.5)) : null;
  };
  return {
    group, widened, tactics, level, out, far, worst, sentence,
    stress: STRESS.map(scenario => compareStress(scenario.key, measures.stress[scenario.key], group)),
    typical: { ac: typical("ac") ?? 0, hp: typical("hp") ?? 0, toHit: typical("toHit"), dc: typical("dc") },
  };
}

/** How far a monster is from its CR (for the list of /admin/bilanciamento): the largest gap of the three tactics. */
export function gapFromCr(comparison: Comparison): number {
  return Math.max(...TACTICS.map(tactic => comparison.tactics[tactic].gap));
}
