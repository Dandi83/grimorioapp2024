import data from "../data/monster-balance-srd.json";
import srd51 from "../data/srd-monsters-5.1-it.json";
import srd521 from "../data/srd-monsters-5.2.1-it.json";
import animals521 from "../data/srd-animals-5.2.1-it.json";
import { balanceWarnings } from "./checks";
import { compare, type Level, type ReferenceRow } from "./compare";
import { readMonster, type SheetFields } from "./parse";

/**
 * The calibration of the Bilanciamento (PROMPT 26): every SRD monster judged against its group without itself, with
 * the measures of lib/data/monster-balance-srd.json. The verdict must give «In linea» to 75–85% of them and «Fuori dal
 * GS» to 5% at most; each warning must be raised on 10% of them at most, except the fixed checks. Read by the tests
 * (tests/balance-calibration.cjs) and by the report of docs/metodo-bilanciamento.md; never by a page.
 */
export type CalibrationEdition = "2014" | "2024";
export const CALIBRATION_LIMITS = { inLineLow: 75, inLineHigh: 85, outHigh: 5, warningHigh: 10 } as const;
/** The fixed checks (heavy control, resistance to every weapon at a low CR, magic resistance with legendary ones): no limit. */
export const FIXED_WARNING = /^(controllo|contromosse:armi$|contromosse:magia$)/;

export type Calibration = {
  edition: CalibrationEdition; total: number;
  levels: Record<Level, number>;
  /** How many SRD monsters raise each warning (a key once per monster). */
  warnings: Record<string, number>;
};

type Records = { records: { monster: SheetFields & { id: string } }[] };
const sheets = (...files: Records[]) => new Map(files.flatMap(file => file.records.map(({ monster }) => [monster.id, monster] as const)));
const SHEETS = { 2014: () => sheets(srd51 as unknown as Records), 2024: () => sheets(srd521 as unknown as Records, animals521 as unknown as Records) };

export function calibrate(edition: CalibrationEdition): Calibration {
  const rows = (data.editions as unknown as Record<CalibrationEdition, ReferenceRow[]>)[edition];
  const byId = SHEETS[edition]();
  const levels: Record<Level, number> = { "in linea": 0, "da controllare": 0, fuori: 0 };
  const warnings: Record<string, number> = {};
  for (const row of rows) {
    const sheet = byId.get(row.id)!;
    const measures = { tactics: row.tactics, stress: row.stress as never };
    const comparison = compare(measures, row.cr, rows, row.id);
    levels[comparison.level]++;
    for (const key of new Set(balanceWarnings(sheet, readMonster(sheet), comparison, measures).map(warning => warning.key))) warnings[key] = (warnings[key] ?? 0) + 1;
  }
  return { edition, total: rows.length, levels, warnings };
}

export const percent = (count: number, total: number) => Math.round((count / total) * 1000) / 10;

const it = (value: number) => value.toLocaleString("it-IT", { maximumFractionDigits: 1 });
const cell = (count: number, total: number) => `${count} (${it(percent(count, total))}%)`;

/** The two tables of the report in docs/metodo-bilanciamento.md, as Markdown lines (tests/balance-calibration.cjs). */
export function calibrationTables(results: Calibration[] = [calibrate("2014"), calibrate("2024")]): { verdicts: string[]; warnings: string[] } {
  const verdicts = [
    "| Edizione | Mostri SRD | In linea | Da controllare | Fuori dal GS |",
    "|---|---|---|---|---|",
    ...results.map(({ edition, total, levels }) => `| ${edition} | ${total} | ${cell(levels["in linea"], total)} | ${cell(levels["da controllare"], total)} | ${cell(levels.fuori, total)} |`),
  ];
  const keys = [...new Set(results.flatMap(result => Object.keys(result.warnings)))].sort();
  const warnings = [
    `| Avviso | ${results.map(result => result.edition).join(" | ")} |`,
    `|---|${results.map(() => "---").join("|")}|`,
    ...keys.map(key => `| \`${key}\`${FIXED_WARNING.test(key) ? " (controllo fisso)" : ""} | ${results.map(result => cell(result.warnings[key] ?? 0, result.total)).join(" | ")} |`),
  ];
  return { verdicts, warnings };
}
