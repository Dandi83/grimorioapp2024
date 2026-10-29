import "server-only";
import data from "../data/monster-balance-srd.json";
import { compare, type Comparison, type Level, type ReferenceRow } from "./compare";
import { readMonster, type MonsterModel, type SheetFields } from "./parse";
import { levelOf } from "./party";
import { simulate, type BalanceMetrics } from "./simulate";

/**
 * Bilanciamento (PROMPT 11), administrator only: a monster against the SRD monsters of its CR and edition. Read only:
 * nothing is written anywhere. The SRD measures come from lib/data/monster-balance-srd.json (scripts/build-monster-balance.mjs).
 */
export { balanceApplies, NOT_FOR_OFFICIAL } from "../balance-scope";
export const FIGHTS = 3000;
export type BalanceEdition = "2014" | "2024";
export type BalanceResult = {
  name: string; edition: BalanceEdition; level: number; model: MonsterModel;
  metrics?: BalanceMetrics; comparison: Comparison;
};

const references = data.editions as unknown as Record<BalanceEdition, ReferenceRow[]>;

/** The edition of a sheet: a homebrew «entrambe» is compared with 2024, its format. */
export function balanceEdition(monster: { homebrew_edizione?: string; edizione?: string }, legacy: boolean): BalanceEdition {
  if (monster.homebrew_edizione) return monster.homebrew_edizione === "2014" ? "2014" : "2024";
  return legacy ? "2014" : "2024";
}

export function evaluateMonster(sheet: SheetFields & { id?: string }, edition: BalanceEdition, fights = FIGHTS): BalanceResult {
  const model = readMonster(sheet);
  const metrics = model.simulable ? simulate(model, fights) : undefined;
  const comparison = compare(metrics ?? { damagePerRound: 0, rounds: 0, downPct: 0, wipePct: 0 }, model.cr, references[edition], sheet.id);
  return { name: sheet.nome, edition, level: levelOf(model.cr), model, metrics, comparison };
}

export function referenceRows(edition: BalanceEdition): ReferenceRow[] {
  return references[edition];
}

const escape = (text: string) => text.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
const number = (value: number | null | undefined) => (value === null || value === undefined ? "—" : value.toLocaleString("it-IT", { maximumFractionDigits: 1 }));
const crLabel = (cr: number) => (cr === 0.125 ? "1/8" : cr === 0.25 ? "1/4" : cr === 0.5 ? "1/2" : String(cr));

function pill(verdict: string) {
  const green = verdict === "in linea";
  return `<span data-balance-verdict="${verdict}" style="display:inline-block;border-radius:999px;padding:1px 9px;font-size:12px;font-weight:700;${green ? "background:#DCEFE2;color:#1F6B45" : "background:#F6D58A;color:#6B4300"}">${verdict}</span>`;
}

/** The final verdict: label and colours (green, amber, bordeaux). */
export const LEVELS: Record<Level, { label: string; slug: string; style: string }> = {
  "in linea": { label: "In linea", slug: "in-linea", style: "background:#1F6B45;color:#FFFFFF" },
  "da controllare": { label: "Da controllare", slug: "da-controllare", style: "background:#FCEFD0;color:#7A4E00;border:1px solid #7A4E00" },
  fuori: { label: "Fuori dal GS", slug: "fuori", style: "background:#7A1F2B;color:#FFFFFF" },
};

/** The sentence beside the verdict: which measure is out and which way. */
export function levelSentence(comparison: Comparison): string {
  return comparison.level === "in linea" ? "Danni e resistenza nella fascia dei mostri del suo GS." : `${comparison.outside.join("; ")}.`;
}

/**
 * The «Bilanciamento» box as HTML, drawn on the server for the administrator (the public page, the editor and the
 * proposals receive only this text through /api/admin/pannello-mostro): never in a public page or in the browser code.
 */
export function balanceBoxHtml(result: BalanceResult): string {
  const { comparison: c, metrics, model } = result;
  const parts: string[] = [];
  parts.push(`<section data-balance-box="" aria-label="Bilanciamento" style="margin:16px 0;border:1.5px dashed #7A4E00;background:#FCEFD0;border-radius:14px;padding:14px 16px;color:#2B2118;font-size:14px;line-height:1.45">`);
  parts.push(`<p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:.12em;color:#7A4E00">BILANCIAMENTO</p>`);
  const editionLabel = result.edition;
  const crText = `GS ${crLabel(model.cr)} ±${c.widened}`;
  if (!metrics) {
    parts.push(`<p data-balance-unsimulable="" style="margin:0 0 10px"><b>Non simulabile:</b> la scheda non ha attacchi né capacità con danni da confrontare.</p>`);
  } else {
    const rows: [string, string, typeof c.damage, (value: number) => string][] = [
      ["damage", "Danni ai PG per round", c.damage, number],
      ["rounds", "Round che resiste", c.rounds, number],
      ["down", "PG a terra (% scontri)", c.down, value => `${number(value)}%`],
    ];
    parts.push(`<dl style="margin:0;display:grid;gap:8px">`);
    for (const [key, label, row, format] of rows) {
      parts.push(`<div data-balance-row="${key}" style="display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;border-bottom:1px solid #E8D3A0;padding-bottom:6px">`
        + `<dt style="flex:1 1 170px;font-weight:700">${label}</dt>`
        + `<dd style="margin:0;flex:1 1 220px">${format(row.value)} <span style="color:#6B5B48">· mediana SRD ${format(row.band.median)} · fascia 10–90: ${format(row.band.low)}–${format(row.band.high)}</span></dd>`
        + `<dd style="margin:0">${pill(row.verdict)}</dd></div>`);
    }
    parts.push(`</dl>`);
    const level = LEVELS[c.level];
    parts.push(`<p data-balance-result="${level.slug}" style="margin:10px 0 2px;display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px">`
      + `<span data-balance-level="" style="display:inline-block;border-radius:999px;padding:2px 10px;font-size:13px;font-weight:800;${level.style}">${level.label}</span>`
      + `<span style="font-weight:600">${escape(levelSentence(c))}</span></p>`);
  }
  parts.push(`<p style="margin:0 0 10px;color:#6B5B48;font-size:13px">Simulazione contro 4 PG di livello ${result.level}; confronto con ${c.group.length} mostri SRD ${editionLabel} ${c.widened ? `di GS vicino (${crText})` : `dello stesso GS (${crLabel(model.cr)})`}.</p>`);
  const own: [string, number | null, number | null][] = [
    ["CA", model.ac, c.typical.ac], ["PF", model.hp, c.typical.hp], ["Bonus per colpire", model.toHit, c.typical.toHit], ["CD", model.dc, c.typical.dc],
  ];
  parts.push(`<table data-balance-typical="" style="width:100%;border-collapse:collapse;font-size:13px"><caption style="text-align:left;font-weight:700;padding-bottom:4px">Valori tipici per questo GS</caption>`
    + `<thead><tr><th style="text-align:left;font-weight:600;color:#6B5B48"></th><th style="text-align:right;font-weight:600;color:#6B5B48">Questa scheda</th><th style="text-align:right;font-weight:600;color:#6B5B48">Mediana SRD</th></tr></thead><tbody>`
    + own.map(([label, mine, typical]) => `<tr><td style="padding:2px 0">${label}</td><td style="text-align:right">${number(mine)}</td><td style="text-align:right">${number(typical)}</td></tr>`).join("")
    + `</tbody></table>`);
  parts.push(`</section>`);
  return parts.join("");
}
