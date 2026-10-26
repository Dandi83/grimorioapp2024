/**
 * Challenge check of a homebrew creature (form «Proponi» and admin area only, never on the public sheet).
 *
 * No table from a non-SRD manual: the reference values come from the SRD creatures of the catalog
 * (SRD 5.2.1 monsters and animals, SRD 5.1 monsters). scripts/build-cr-reference.mjs reads them with the
 * same functions used here and stores, for every challenge rating, the medians of hit points, armour
 * class, attack bonus, save DC and damage per round (lib/data/gs-riferimento.json).
 *
 * Estimate: defence = the rating whose median hit points match, moved by one step every 2 points of armour
 * class above or below the median of that rating; attack = the same with the damage per round and the
 * attack bonus (or the save DC when there is no attack roll); the estimate is their average.
 */

export interface CrReferenceRow { gs: string; n: number; pf: number; ca: number; attacco: number | null; cd: number | null; danni: number }
export interface CrReference { metodo: string; righe: CrReferenceRow[] }

interface CrInput { pf: number; ca: number; azioni: string; gs: string }
interface CrResult {
  difesa: string;
  attacco: string;
  stimato: string;
  esito: "in-linea" | "troppo-forte" | "troppo-debole";
  spiegazione: string;
  danni: number;
  bonus: number | null;
  cd: number | null;
}

const NUMBERS: Record<string, number> = { un: 1, uno: 1, una: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8 };

/** Plain text of an HTML block (the stored sheets) or of the form entries. */
function plainOf(html: string): string {
  return html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "’");
}

/** Paragraphs «Nome. testo» of a block. */
function entriesOf(text: string): { nome: string; testo: string }[] {
  return text.split(/\n\s*\n+/).map(part => part.trim()).filter(Boolean).map(part => {
    const match = /^([^.\n]{1,80})\.\s*([\s\S]*)$/.exec(part);
    return match ? { nome: match[1].trim(), testo: match[2] } : { nome: "", testo: part };
  });
}

/** Average damage of one action: every «N (XdY…)» amount of its first effect (hit or failed save), «più» included. */
function averageDamage(text: string): number {
  const effect = text.split(/\bSuccesso\s*:|\bMancato\s*:/i)[0];
  return [...effect.matchAll(/(\d+)\s*\(\s*\d+d\d+[^)]*\)\s*danni/gi)].reduce((sum, match) => sum + Number(match[1]), 0);
}

export function attackBonus(text: string): number | null {
  const values = [...text.matchAll(/(?:Tiro per colpire[^:]*|Attacco con [^:]*):\s*([+-]\d+)/gi)].map(match => Number(match[1]));
  return values.length ? Math.max(...values) : null;
}

export function saveDc(text: string): number | null {
  const values = [...text.matchAll(/\bCD\s*(\d+)/g)].map(match => Number(match[1]));
  return values.length ? Math.max(...values) : null;
}

const isAttack = (text: string) => /Tiro per colpire|Attacco con (?:arma|incantesimo)/i.test(text);

/** Damage per round: the Multiattack (named attacks × their damage, or N attacks × the best one) or the best action. */
export function damagePerRound(actionsText: string): number {
  const entries = entriesOf(actionsText);
  const damage = new Map(entries.map(entry => [entry.nome.toLowerCase().replace(/\s*\(.*\)$/, ""), averageDamage(entry.testo)]));
  const best = Math.max(0, ...entries.map(entry => averageDamage(entry.testo)));
  const attacks = entries.filter(entry => isAttack(entry.testo)).map(entry => averageDamage(entry.testo));
  const multi = entries.find(entry => /^multiattacco/i.test(entry.nome));
  if (!multi) return best;
  const text = multi.testo.toLowerCase();
  let named = 0;
  for (const [name, value] of damage) {
    if (!name || name.startsWith("multiattacco") || !value) continue;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const mention = new RegExp(`\\b(un|uno|una|due|tre|quattro|cinque|sei|sette|otto|\\d)\\s+(?:attacc[oh]i?\\s+)?(?:con\\s+(?:il\\s+|la\\s+|lo\\s+|l['’]\\s*|i\\s+|le\\s+|gli\\s+)?)?(?:[a-zà-ù]+\\s+)?${escaped}`, "i").exec(text);
    if (mention) named += (NUMBERS[mention[1]] ?? Number(mention[1])) * value;
  }
  const total = /\b(un|uno|una|due|tre|quattro|cinque|sei|sette|otto|\d)\s+attacchi\b/.exec(text);
  const count = total ? NUMBERS[total[1]] ?? Number(total[1]) : 0;
  const byCount = count * (attacks.length ? Math.max(...attacks) : best);
  return Math.max(named || byCount, best);
}

function gsNumber(gs: string): number {
  const [a, b] = gs.split("/").map(Number);
  return b ? a / b : a;
}

const leading = (text: string) => Number(/\d+/.exec(text || "")?.[0] ?? NaN);

/** The numbers of a sheet the check uses. */
export function statsOf(sheet: { punti_ferita: string; classe_armatura: string; azioni: string; grado_sfida: string }) {
  const azioni = plainOf(sheet.azioni || "");
  return { pf: leading(sheet.punti_ferita), ca: leading(sheet.classe_armatura), azioni, gs: sheet.grado_sfida };
}

/** Position of a value on a rising curve (the medians made monotone), between two ratings when it falls in between. */
function position(values: number[], value: number): number {
  const rising = values.reduce<number[]>((list, v) => [...list, Math.max(v, list.at(-1) ?? -Infinity)], []);
  if (value <= rising[0]) return 0;
  for (let i = 1; i < rising.length; i++) {
    if (value <= rising[i]) return rising[i] === rising[i - 1] ? i : i - 1 + (value - rising[i - 1]) / (rising[i] - rising[i - 1]);
  }
  return rising.length - 1;
}

export function estimateChallenge(input: CrInput, reference: CrReference): CrResult {
  const rows = reference.righe;
  const last = rows.length - 1;
  const clamp = (x: number) => Math.min(last, Math.max(0, x));
  const at = (x: number) => rows[clamp(Math.round(x))];
  const danni = damagePerRound(input.azioni);
  const bonus = attackBonus(input.azioni);
  const cd = saveDc(input.azioni);
  let defence = position(rows.map(row => row.pf), input.pf);
  defence = clamp(defence + (input.ca - at(defence).ca) / 2);
  let attack = position(rows.map(row => row.danni), danni);
  const ref = at(attack);
  if (bonus !== null && ref.attacco !== null) attack = clamp(attack + (bonus - ref.attacco) / 2);
  else if (cd !== null && ref.cd !== null) attack = clamp(attack + (cd - ref.cd) / 2);
  const estimated = clamp(Math.round((defence + attack) / 2));
  // A rating without SRD creatures (25–29) is compared with the nearest one that has them.
  const wanted = gsNumber(input.gs);
  const target = rows.reduce((best, row, i) => (Math.abs(gsNumber(row.gs) - wanted) < Math.abs(gsNumber(rows[best].gs) - wanted) ? i : best), 0);
  const gap = estimated - target;
  const difesa = at(defence).gs, attacco = at(attack).gs, stimato = rows[estimated].gs;
  const esito = Math.abs(gap) <= 1 ? "in-linea" : gap > 0 ? "troppo-forte" : "troppo-debole";
  const spiegazione = esito === "in-linea"
    ? `Difesa e attacco sono quelli di una creatura di GS ${stimato}, in linea con il GS ${input.gs} indicato.`
    : difesa === attacco
      ? `PF e danni sono quelli di un GS ${difesa}: ${esito === "troppo-forte" ? "più forte" : "più debole"} del GS ${input.gs} indicato.`
      : `PF e CA sono quelli di un GS ${difesa}, i danni (${danni} a round) di un GS ${attacco}: ${esito === "troppo-forte" ? "più forte" : "più debole"} del GS ${input.gs} indicato.`;
  return { difesa, attacco, stimato, esito, spiegazione, danni, bonus, cd };
}

export const VERDICT_LABEL: Record<CrResult["esito"], string> = { "in-linea": "GS in linea", "troppo-forte": "Troppo forte", "troppo-debole": "Troppo debole" };
