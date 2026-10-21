import monsters2024 from "./data/srd-monsters-5.2.1-it.json";
import monsters2014 from "./data/srd-monsters-5.1-it.json";
import animals2024 from "./data/srd-animals-5.2.1-it.json";
import manualData from "./data/srd-manual-5.2.1-it.json";
import type { ChallengeOption } from "./advancement";

/**
 * XP per challenge rating, read from the SRD monster sheets of the app (2014 and 2024), not from a
 * table written by hand. "5.900, o 7.200 nella tana" gives the rating and its lair value. A value
 * found on a single sheet while another value of the same rating is on three or more is treated as
 * a misprint and left out (listed by `challengeOutliers`).
 */
interface Sheet { id: string; nome: string; grado_sfida: string; gs_num: number; px: string }
const sheets: Sheet[] = [monsters2024, monsters2014, animals2024].flatMap(file => file.records.map(record => record.monster as unknown as Sheet));

const parseXp = (text: string) => Number(text.replace(/\./g, ""));

function tally() {
  const byRating = new Map<number, { label: string; base: Map<number, Sheet[]>; lair: Map<number, Sheet[]> }>();
  for (const sheet of sheets) {
    const match = /^([\d.]+)(?:, o ([\d.]+) nella tana)?$/.exec(String(sheet.px).trim());
    if (!match || !Number.isFinite(sheet.gs_num)) continue;
    const entry = byRating.get(sheet.gs_num) ?? { label: sheet.grado_sfida, base: new Map(), lair: new Map() };
    byRating.set(sheet.gs_num, entry);
    const add = (map: Map<number, Sheet[]>, xp: number) => map.set(xp, [...(map.get(xp) ?? []), sheet]);
    add(entry.base, parseXp(match[1]));
    if (match[2]) add(entry.lair, parseXp(match[2]));
  }
  return byRating;
}

const isOutlier = (sheets: Sheet[], all: Map<number, Sheet[]>) => sheets.length === 1 && [...all.values()].some(other => other.length >= 3);

export function challengeOptions(): ChallengeOption[] {
  const options: ChallengeOption[] = [];
  for (const [gs, entry] of [...tally()].sort((a, b) => a[0] - b[0])) {
    const base = [...entry.base].filter(([, list]) => !isOutlier(list, entry.base)).sort((a, b) => b[1].length - a[1].length);
    for (const [xp] of base) options.push({ key: `${gs}-${xp}`, label: `GS ${entry.label}`, pe: xp, gs });
    for (const [xp] of [...entry.lair].sort((a, b) => a[0] - b[0])) options.push({ key: `${gs}-tana-${xp}`, label: `GS ${entry.label} nella tana`, pe: xp, gs });
  }
  return options;
}

/** Sheets whose XP was left out as a misprint: "Arcimago (GS 12): 8.000". */
export function challengeOutliers(): string[] {
  const out: string[] = [];
  for (const entry of tally().values())
    for (const [xp, list] of entry.base) if (isOutlier(list, entry.base)) out.push(...list.map(sheet => `${sheet.nome} (GS ${sheet.grado_sfida}): ${xp}`));
  return out;
}

/**
 * "Talenti bonus al 20º livello" (rule 2024), word for word from the 2024 manual: the sidebar of
 * "Creazione del personaggio". The PDF line breaks and hyphenations ("avanza-\nmento") are joined.
 */
export function bonusFeatsRule(): { title: string; text: string; page: number } | undefined {
  const entry = manualData.entries.find(item => item.id === "personaggi-creazione-del-personaggio");
  const block = entry?.blocks.find(item => item.text.startsWith("Talenti bonus al 20º livello"));
  if (!block) return undefined;
  const [title, ...lines] = block.text.split("\n");
  return { title, text: lines.join("\n").replace(/-\n/g, "").replace(/\s*\n\s*/g, " ").trim(), page: block.page };
}
