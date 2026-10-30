import "server-only";
import data from "../data/monster-balance-srd.json";
import { balanceWarnings, type BalanceWarning } from "./checks";
import { compare, MAX_OUT, MEASURES, TACTIC_LABEL, TOLERANCE, type Comparison, type Level, type MetricResult, type ReferenceRow } from "./compare";
import { readMonster, type MonsterModel, type SheetFields } from "./parse";
import { levelOf } from "./party";
import { BASE_FIGHTS, fightsOfASheet, measure, STRESS, STRESS_FIGHTS, type Measures } from "./scenarios";
import { TACTICS, type Tactic } from "./simulate";

/**
 * Bilanciamento (PROMPT 11, 12, 19), administrator only: a monster against the SRD monsters of its CR and edition, with
 * three tactics of the master, 7 test situations and the checks the CR does not measure. Read only: nothing is written
 * anywhere. The SRD measures come from lib/data/monster-balance-srd.json (scripts/build-monster-balance.mjs).
 */
export { balanceApplies, NOT_FOR_OFFICIAL } from "../balance-scope";
export const FIGHTS = BASE_FIGHTS;
export type BalanceEdition = "2014" | "2024";
export type BalanceResult = {
  name: string; edition: BalanceEdition; level: number; model: MonsterModel;
  measures?: Measures; comparison: Comparison; warnings: BalanceWarning[];
  /** Fights simulated for this sheet (all tactics and situations). */
  fights: number;
};

const references = data.editions as unknown as Record<BalanceEdition, ReferenceRow[]>;

/** The edition of a sheet: a homebrew «entrambe» is compared with 2024, its format (see balanceEditions for both). */
export function balanceEdition(monster: { homebrew_edizione?: string; edizione?: string }, legacy: boolean): BalanceEdition {
  if (monster.homebrew_edizione) return monster.homebrew_edizione === "2014" ? "2014" : "2024";
  return legacy ? "2014" : "2024";
}

/**
 * The editions a sheet is checked against (PROMPT 22): a homebrew «2014 e 2024» against both SRD, 2024 first; every other
 * sheet against its own edition only.
 */
export function balanceEditions(monster: { homebrew_edizione?: string; edizione?: string }, legacy: boolean): BalanceEdition[] {
  return monster.homebrew_edizione === "entrambe" ? ["2024", "2014"] : [balanceEdition(monster, legacy)];
}

/** The overall verdict of one or two checks: «in linea» only when every one is; the worst otherwise. null: not simulable. */
export function overallLevel(results: readonly BalanceResult[]): Level | null {
  if (results.some(result => !result.measures)) return null;
  const rank: Record<Level, number> = { "in linea": 0, "da controllare": 1, fuori: 2 };
  return results.map(result => result.comparison.level).reduce((worst, level) => (rank[level] > rank[worst] ? level : worst), "in linea" as Level);
}

const EMPTY = { damagePerRound: 0, rounds: 0, downPct: 0, wipePct: 0, winPct: 0, oneShotPct: 0 };

/**
 * The results of a version of a sheet, kept in memory: the same fields and edition give the same fights (fixed seed),
 * so a sheet is computed again only when it changes. The oldest go beyond 300 versions.
 */
const cache = new Map<string, BalanceResult>();
const CACHE_SIZE = 300;
const CACHE_FIELDS: (keyof SheetFields)[] = [
  "nome", "gs_num", "classe_armatura", "punti_ferita", "tiri_salvezza", "forza", "destrezza", "costituzione", "intelligenza", "saggezza", "carisma",
  "resistenze", "immunita_danni", "immunita", "immunita_condizioni", "tratti", "azioni", "azioni_bonus", "azioni_leggendarie", "reazioni",
];
export const cacheKey = (sheet: SheetFields & { id?: string }, edition: BalanceEdition, fights: number) =>
  JSON.stringify([sheet.id ?? "", edition, fights, ...CACHE_FIELDS.map(field => sheet[field] ?? "")]);
export const cachedResults = () => cache.size;

export function evaluateMonster(sheet: SheetFields & { id?: string }, edition: BalanceEdition, fights = FIGHTS): BalanceResult {
  const key = cacheKey(sheet, edition, fights);
  const kept = cache.get(key);
  if (kept) return kept;
  const model = readMonster(sheet);
  const measures = model.simulable ? measure(model, fights, Math.min(STRESS_FIGHTS, fights)) : undefined;
  const comparison = compare(measures ?? {
    tactics: Object.fromEntries(TACTICS.map(tactic => [tactic, EMPTY])) as Measures["tactics"],
    stress: Object.fromEntries(STRESS.map(({ key }) => [key, EMPTY])) as Measures["stress"],
  }, model.cr, references[edition], sheet.id);
  const result: BalanceResult = {
    name: sheet.nome, edition, level: levelOf(model.cr), model, measures, comparison,
    warnings: measures ? balanceWarnings(sheet, model, comparison, measures) : [],
    fights: measures ? fightsOfASheet(fights, Math.min(STRESS_FIGHTS, fights)) : 0,
  };
  cache.set(key, result);
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!);
  return result;
}

export function referenceRows(edition: BalanceEdition): ReferenceRow[] {
  return references[edition];
}

const escape = (text: string) => text.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
const number = (value: number | null | undefined) => (value === null || value === undefined ? "—" : value.toLocaleString("it-IT", { maximumFractionDigits: 1 }));
const crLabel = (cr: number) => (cr === 0.125 ? "1/8" : cr === 0.25 ? "1/4" : cr === 0.5 ? "1/2" : String(cr));

function pill(verdict: string) {
  const green = verdict === "in linea";
  return `<span data-balance-verdict="${verdict}" style="display:inline-block;border-radius:999px;padding:1px 8px;font-size:11px;font-weight:700;${green ? "background:#DCEFE2;color:#1F6B45" : "background:#F6D58A;color:#6B4300"}">${verdict}</span>`;
}

/** The verdict: label and colours (green, amber, bordeaux). */
export const LEVELS: Record<Level, { label: string; slug: string; style: string }> = {
  "in linea": { label: "In linea", slug: "in-linea", style: "background:#1F6B45;color:#FFFFFF" },
  "da controllare": { label: "Da controllare", slug: "da-controllare", style: "background:#FCEFD0;color:#7A4E00;border:1px solid #7A4E00" },
  fuori: { label: "Fuori dal GS", slug: "fuori", style: "background:#7A1F2B;color:#FFFFFF" },
};

/** The sentence beside the verdict: which tactic and which measure («Con un master che sceglie a caso cade troppo presto»). */
export function levelSentence(comparison: Comparison): string {
  return comparison.sentence;
}

const h = (text: string) => `<p style="margin:12px 0 6px;font-size:12px;font-weight:800;letter-spacing:.08em;color:#7A4E00">${text}</p>`;

/**
 * The «Bilanciamento» box as HTML, drawn on the server for the administrator (the public page, the editor and the
 * proposals receive only this text through /api/admin/pannello-mostro): never in a public page or in the browser code.
 */
const BOX_OPEN = `<section data-balance-box="" aria-label="Bilanciamento" style="margin:16px 0;border:1.5px dashed #7A4E00;background:#FCEFD0;border-radius:14px;padding:14px 16px;color:#2B2118;font-size:14px;line-height:1.45">`
  + `<p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:.12em;color:#7A4E00">BILANCIAMENTO</p>`;
export const EDITION_CHECK: Record<BalanceEdition, string> = { "2024": "Edizione 2024 (SRD 5.2.1)", "2014": "Edizione 2014 (SRD 5.1)" };

/**
 * One check, or two for a creature «2014 e 2024» (PROMPT 22): the overall verdict on top («In linea» only when both
 * are), then each edition with its numbers, its band, its verdict, its situations and warnings.
 */
export function balanceBoxHtml(input: BalanceResult | readonly BalanceResult[]): string {
  const results = Array.isArray(input) ? input as readonly BalanceResult[] : [input as BalanceResult];
  if (results.length === 1) return `${BOX_OPEN}${checkHtml(results[0])}</section>`;
  const overall = overallLevel(results);
  const head = overall
    ? `<p data-balance-overall="${LEVELS[overall].slug}" style="margin:0 0 6px;display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px"><b style="font-weight:700">Esito complessivo:</b>`
      + `<span style="display:inline-block;border-radius:999px;padding:2px 10px;font-size:13px;font-weight:800;${LEVELS[overall].style}">${LEVELS[overall].label}</span></p>`
      + `<p style="margin:0 0 4px;color:#6B5B48;font-size:12px">Creatura «2014 e 2024»: due controlli, uno per edizione; in linea solo se lo sono entrambi.</p>`
    : `<p data-balance-overall="non-simulabile" style="margin:0 0 6px"><b>Esito complessivo:</b> non simulabile.</p>`;
  return BOX_OPEN + head + results.map(result =>
    `<div data-balance-edition="${result.edition}" style="margin-top:12px;border-top:1.5px solid #E8D3A0;padding-top:10px">`
    + `<p style="margin:0 0 8px;font-family:var(--font-serif),serif;font-size:17px;font-weight:700;color:#7A1F2B">${EDITION_CHECK[result.edition]}</p>${checkHtml(result)}</div>`).join("") + `</section>`;
}

function checkHtml(result: BalanceResult): string {
  const { comparison: c, measures, model, warnings } = result;
  const parts: string[] = [];
  const groupText = `${c.group.length} mostri SRD ${result.edition} ${c.widened ? `di GS vicino (GS ${crLabel(model.cr)} ±${c.widened})` : `dello stesso GS (${crLabel(model.cr)})`}`;
  if (!measures) {
    parts.push(`<p data-balance-unsimulable="" style="margin:0 0 10px"><b>Non simulabile:</b> la scheda non ha attacchi né capacità con danni da confrontare.</p>`);
  } else {
    const level = LEVELS[c.level];
    parts.push(`<p data-balance-result="${level.slug}" style="margin:0 0 10px;display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px">`
      + `<span data-balance-level="" style="display:inline-block;border-radius:999px;padding:2px 10px;font-size:13px;font-weight:800;${level.style}">${level.label}</span>`
      + `<span style="font-weight:600" data-balance-sentence="">${escape(c.sentence)}</span></p>`);
    // The three tactics: damage, rounds, characters down; each value with its pill against the same tactic of the SRD monsters.
    const cell = (key: string, row: MetricResult, format: (value: number) => string) =>
      `<td data-balance-cell="${key}" style="padding:5px 4px;text-align:right;white-space:nowrap">${format(row.value)}<br>${pill(row.verdict)}</td>`;
    parts.push(`<div style="overflow-x:auto"><table data-balance-tactics="" style="width:100%;border-collapse:collapse;font-size:13px">`
      + `<thead><tr><th style="text-align:left;font-weight:700;padding:0 4px 4px 0">Master</th><th style="text-align:right;font-weight:700;padding:0 4px 4px">Danni a round</th><th style="text-align:right;font-weight:700;padding:0 4px 4px">Round</th><th style="text-align:right;font-weight:700;padding:0 0 4px 4px">PG a terra</th></tr></thead><tbody>`
      + TACTICS.map((tactic: Tactic) => {
        const row = c.tactics[tactic];
        return `<tr data-balance-tactic="${tactic}" style="border-top:1px solid #E8D3A0"><th scope="row" style="text-align:left;padding:5px 4px 5px 0;font-weight:600">${TACTIC_LABEL[tactic]}</th>`
          + cell("damage", row.damage, number) + cell("rounds", row.rounds, number) + cell("down", row.down, value => `${number(value)}%`) + `</tr>`;
      }).join("")
      + `</tbody></table></div>`);
    parts.push(`<p style="margin:4px 0 0;color:#6B5B48;font-size:12px">Fascia 5–95 dei mostri SRD con lo stesso modo di giocare (in linea con al massimo ${MAX_OUT} misure su ${MEASURES} fuori fascia, ciascuna di non più del ${TOLERANCE}%; PG a terra con il modo ottimale: ${number(c.tactics.ottimale.down.band.low)}–${number(c.tactics.ottimale.down.band.high)}%): ${TACTICS.map(tactic => `${TACTIC_LABEL[tactic]} ${number(c.tactics[tactic].damage.band.low)}–${number(c.tactics[tactic].damage.band.high)} danni, ${number(c.tactics[tactic].rounds.band.low)}–${number(c.tactics[tactic].rounds.band.high)} round`).join(" · ")}.</p>`);
    // The test situations: ✓ or ⚠ with the data.
    parts.push(h("SITUAZIONI DI PROVA"));
    parts.push(`<ul data-balance-stress="" style="margin:0;padding:0;list-style:none;display:grid;gap:4px">`
      + c.stress.map(stress => {
        const warn = stress.warnings.length > 0;
        const data = warn ? stress.warnings.join("; ") : `PG vincono ${stress.metrics.winPct}% · sterminati ${stress.metrics.wipePct}% · ${number(stress.metrics.rounds)} round`;
        return `<li data-balance-situation="${stress.key}" data-situation-ok="${warn ? "no" : "si"}" style="display:flex;gap:6px"><span aria-hidden="true" style="font-weight:800;color:${warn ? "#7A4E00" : "#1F6B45"}">${warn ? "⚠" : "✓"}</span>`
          + `<span><b style="font-weight:600">${escape(stress.label)}</b><span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap"> ${warn ? "da controllare" : "nella norma"}</span>: ${escape(data)}</span></li>`;
      }).join("")
      + `</ul>`);
    // The checks the CR does not measure.
    const checks = warnings.filter(warning => warning.kind !== "prova");
    parts.push(h("AVVISI"));
    parts.push(checks.length
      ? `<ul data-balance-warnings="${checks.length}" style="margin:0;padding:0 0 0 18px">${checks.map(warning =>
        `<li data-balance-warning="${warning.key}"${warning.strong ? ' data-strong=""' : ""} style="margin:2px 0"><b style="font-weight:600">${escape(warning.text)}</b> <span style="color:#6B5B48">(${escape(warning.data)})</span></li>`).join("")}</ul>`
      : `<p data-balance-warnings="0" style="margin:0">Nessun avviso.</p>`);
  }
  const own: [string, number | null, number | null][] = [
    ["CA", model.ac, c.typical.ac], ["PF", model.hp, c.typical.hp], ["Bonus per colpire", model.toHit, c.typical.toHit], ["CD", model.dc, c.typical.dc],
  ];
  parts.push(`<table data-balance-typical="" style="margin-top:12px;width:100%;border-collapse:collapse;font-size:13px"><caption style="text-align:left;font-weight:700;padding-bottom:4px">Valori tipici per questo GS</caption>`
    + `<thead><tr><th style="text-align:left;font-weight:600;color:#6B5B48"></th><th style="text-align:right;font-weight:600;color:#6B5B48">Questa scheda</th><th style="text-align:right;font-weight:600;color:#6B5B48">Mediana SRD</th></tr></thead><tbody>`
    + own.map(([label, mine, typical]) => `<tr><td style="padding:2px 0">${label}</td><td style="text-align:right">${number(mine)}</td><td style="text-align:right">${number(typical)}</td></tr>`).join("")
    + `</tbody></table>`);
  parts.push(`<p data-balance-note="" style="margin:10px 0 0;color:#6B5B48;font-size:12px">Simulazione: ${number(result.fights)} combattimenti contro 4 PG di livello ${result.level}; confronto con ${groupText}; scenari: base + ${STRESS.length} di prova.</p>`);
  return parts.join("");
}
