/**
 * Bilanciamento (PROMPT 11): a monster sheet read as a simple model, from the fields every sheet already has (SRD
 * 2014 and 2024, homebrew, sheets made in the reserved area). Pure functions: the sheet is only read.
 */

export type Ability = "for" | "des" | "cos" | "int" | "sag" | "car";
export const ABILITIES: Ability[] = ["for", "des", "cos", "int", "sag", "car"];

/** A group of dice: count × dX + flat (flat alone when count is 0). */
export type Dice = { count: number; sides: number; flat: number };
export type Attack = { name: string; bonus: number; dice: Dice[]; average: number };
export type SaveAbility = {
  name: string; ability: Ability; dc: number; dice: Dice[]; average: number;
  /** Half the damage on a success. */
  half: boolean;
  /** 2 for an area or several creatures, else 1. */
  targets: number;
  /** «Ricarica 5–6»: ready again on 5 or more on a d6. */
  recharge?: number;
  /** «2/giorno»: uses per fight. */
  perDay?: number;
};
export type LegendaryOption = { name: string; cost: number; once: boolean } & ({ kind: "attack"; attack: Attack } | { kind: "save"; save: SaveAbility });
export type MonsterModel = {
  name: string;
  cr: number;
  ac: number;
  hp: number;
  saves: Record<Ability, number>;
  attacks: Attack[];
  /** How many times the multiattack uses the attack with the most average damage (1 without a multiattack). */
  multiattack: number;
  abilities: SaveAbility[];
  legendary: { uses: number; options: LegendaryOption[] };
  legendaryResistance: number;
  magicResistance: boolean;
  /** Resistance (or immunity) to bludgeoning, piercing and slashing together. */
  weaponResistance: boolean;
  /** Something to fight with: an attack or a damaging ability. */
  simulable: boolean;
  /** The highest attack bonus and save DC of the sheet (the table of typical values). */
  toHit: number | null;
  dc: number | null;
};

/** The fields of a sheet the model reads (a Monster of lib/monsters-types.ts has them all). */
export type SheetFields = {
  nome: string; gs_num: number; classe_armatura: string; punti_ferita: string; tiri_salvezza?: string;
  forza: number; destrezza: number; costituzione: number; intelligenza: number; saggezza: number; carisma: number;
  resistenze?: string; immunita_danni?: string; immunita?: string; tratti?: string; azioni?: string; azioni_bonus?: string; azioni_leggendarie?: string;
};

const ABILITY_NAMES: Record<string, Ability> = {
  for: "for", forza: "for", des: "des", destrezza: "des", cos: "cos", costituzione: "cos",
  int: "int", intelligenza: "int", sag: "sag", saggezza: "sag", car: "car", carisma: "car",
};
const NUMBER_WORDS: Record<string, number> = { un: 1, uno: 1, una: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6 };

/** Text without tags and entities, with the minus signs made plain. */
export function plain(html: string): string {
  return html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/[−–]/g, (sign) => (sign === "−" ? "-" : "–")).replace(/\s+/g, " ").trim();
}

/** The entries of a block: separated by <br><br>, the name in the first <strong>. A name split over two entries is joined. */
export function entries(html = ""): { name: string; text: string }[] {
  const parts = html.split(/<br\s*\/?>\s*<br\s*\/?>/i).map(part => part.trim()).filter(Boolean);
  const result: { name: string; text: string }[] = [];
  for (const part of parts) {
    const match = /^\s*<strong>([\s\S]*?)<\/strong>([\s\S]*)$/i.exec(part);
    const name = match ? plain(match[1]) : "";
    const text = plain(match ? match[2] : part);
    // «Resistenza leggendaria (3/giorno o 4/giorno nella» + «tana).»: an open bracket continues in the next entry.
    const last = result[result.length - 1];
    if (last && /\([^)]*$/.test(last.name) && !last.text) { last.name = `${last.name} ${name}`.trim(); last.text = text; continue; }
    result.push({ name, text });
  }
  return result;
}

const firstNumber = (text: string) => { const match = /\d+/.exec(text || ""); return match ? Number(match[0]) : 0; };

/** «N (XdY ± Z) danni» (and «N danni» without dice): each group of dice, with its stated average. */
export function damageDice(text: string): { dice: Dice[]; average: number } {
  const dice: Dice[] = [];
  let average = 0;
  const pattern = /(\d+)\s*(?:\(\s*(\d+)d(\d+)\s*(?:([+-])\s*(\d+))?\s*\))?\s*dann[oi]/g;
  for (const match of text.matchAll(pattern)) {
    average += Number(match[1]);
    if (match[2]) dice.push({ count: Number(match[2]), sides: Number(match[3]), flat: match[4] ? Number(`${match[4]}${match[5]}`) : 0 });
    else dice.push({ count: 0, sides: 0, flat: Number(match[1]) });
  }
  return { dice, average };
}

/** The attack bonus: «Tiro per colpire in mischia: +11» (2024) or «+7 al tiro per colpire» (2014). */
function attackBonus(text: string): number | undefined {
  const match = /Tiro per colpire[^:]{0,60}:\s*([+-]\s*\d+)/i.exec(text) ?? /([+-]\s*\d+) al tiro per colpire/i.exec(text);
  return match ? Number(match[1].replace(/\s/g, "")) : undefined;
}

function readAttack(name: string, text: string): Attack | undefined {
  const bonus = attackBonus(text);
  if (bonus === undefined) return undefined;
  const hit = /Colpito:/i.exec(text);
  if (!hit) return undefined;
  const { dice, average } = damageDice(text.slice(hit.index));
  return dice.length ? { name: cleanName(name), bonus, dice, average } : undefined;
}

const cleanName = (name: string) => name.replace(/\.\s*$/, "").trim();

/** An ability with a saving throw and damage: «Tiro salvezza su Destrezza: CD 18» (2024) or «tiro salvezza su Destrezza con CD 18» (2014). */
function readSave(name: string, text: string): SaveAbility | undefined {
  const save = /tiro salvezza su (Forza|Destrezza|Costituzione|Intelligenza|Saggezza|Carisma)\s*(?::|con)?\s*CD\s*(\d+)/i.exec(text)
    ?? /tiro salvezza su (Forza|Destrezza|Costituzione|Intelligenza|Saggezza|Carisma)[^.]{0,80}?CD\s*(\d+)/i.exec(text);
  if (!save) return undefined;
  // 2024: the dice of «Fallimento:» (up to «Successo:»); 2014: the dice after the saving throw.
  const failure = /Fallimento:/i.exec(text);
  const from = failure ? failure.index : save.index;
  const success = failure ? text.slice(from).search(/Successo:|Fallimento o successo:/i) : -1;
  const segment = text.slice(from, success > 0 ? from + success : undefined);
  const { dice, average } = damageDice(segment);
  if (!dice.length) return undefined;
  const recharge = /ricarica\s*(\d)/i.exec(name);
  const perDay = /(\d+)\s*\/\s*giorno/i.exec(name);
  return {
    name: cleanName(name).replace(/\s*\(.*\)$/, ""), ability: ABILITY_NAMES[save[1].toLowerCase()], dc: Number(save[2]), dice, average,
    half: /dimezzat|la metà/i.test(text),
    targets: /tutte le creature|ogni creatura|ciascuna creatura|fino a (due|tre|quattro) creature/i.test(text) ? 2 : 1,
    ...(recharge ? { recharge: Number(recharge[1]) } : {}),
    ...(perDay ? { perDay: Number(perDay[1]) } : {}),
  };
}

function savingThrows(sheet: SheetFields): Record<Ability, number> {
  const modifier = (score: number) => Math.floor(((Number(score) || 10) - 10) / 2);
  const saves: Record<Ability, number> = {
    for: modifier(sheet.forza), des: modifier(sheet.destrezza), cos: modifier(sheet.costituzione),
    int: modifier(sheet.intelligenza), sag: modifier(sheet.saggezza), car: modifier(sheet.carisma),
  };
  for (const match of plain(sheet.tiri_salvezza || "").matchAll(/(For|Des|Cos|Int|Sag|Car)\w*\s*([+-]\s*\d+)/gi))
    saves[ABILITY_NAMES[match[1].toLowerCase()]] = Number(match[2].replace(/\s/g, ""));
  return saves;
}

/**
 * «un/due/tre/quattro attacchi» in the first sentence of the multiattack that speaks of attacks (before « o »), all of
 * them added up («un attacco Morso e altri tre attacchi» = 4; 2014: «Poi effettua tre attacchi» after the frightful
 * presence); 2 when no number is said.
 */
export function multiattackCount(text: string): number {
  const sentence = text.split(/\.\s/).find(part => /attacc/i.test(part)) ?? "";
  const first = sentence.split(/\s+o\s+/)[0];
  const counts = [...first.matchAll(/\b(un|uno|una|due|tre|quattro|cinque|sei)\s+(?:altri\s+|altre\s+)?attacc/gi)].map(match => NUMBER_WORDS[match[1].toLowerCase()]);
  return counts.length ? counts.reduce((sum, count) => sum + count, 0) : 2;
}

const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function legendary(html: string, attacks: Attack[]): MonsterModel["legendary"] {
  const items = entries(html);
  const all = plain(html);
  const usesMatch = /leggendarie:\s*(\d+)/i.exec(all) ?? /(?:eseguire|effettuare)\s+(\d+)\s+azioni leggendarie/i.exec(all);
  const uses = usesMatch ? Number(usesMatch[1]) : 0;
  const options: LegendaryOption[] = [];
  for (const { name, text } of items) {
    if (!name) continue;
    const cost = /costa\s*(\d)/i.exec(`${name} ${text}`) ? Number(/costa\s*(\d)/i.exec(`${name} ${text}`)![1]) : 1;
    const once = /non può ripetere/i.test(text);
    const base = { name: cleanName(name).replace(/\s*\(.*\)$/, ""), cost, once };
    const save = readSave(name, text);
    if (save) { options.push({ ...base, kind: "save", save }); continue; }
    const own = readAttack(name, text);
    if (own) { options.push({ ...base, kind: "attack", attack: own }); continue; }
    // «effettua un attacco Squarcio» (2024), «effettua un attacco con la coda» (2014).
    const target = /effettua\s+(?:un|uno|una)\s+attacc\w*\s+(?:con\s+(?:il|lo|la|l'|i|gli|le)\s*)?([\p{L}' ]+)/iu.exec(text);
    if (target) {
      const words = normalize(target[1]).split(/\s+/).filter(word => word.length > 2);
      const attack = attacks.find(candidate => words.some(word => normalize(candidate.name).includes(word.slice(0, Math.max(4, word.length - 2)))));
      if (attack) options.push({ ...base, kind: "attack", attack });
    }
  }
  return { uses: options.length ? uses : 0, options };
}

export function readMonster(sheet: SheetFields): MonsterModel {
  const actions = entries(sheet.azioni);
  const bonusActions = entries(sheet.azioni_bonus);
  const attacks = actions.map(({ name, text }) => readAttack(name, text)).filter((attack): attack is Attack => !!attack);
  const abilities = [...actions, ...bonusActions]
    .filter(({ name, text }) => !/^multiattacco/i.test(name) && attackBonus(text) === undefined)
    .map(({ name, text }) => readSave(name, text)).filter((save): save is SaveAbility => !!save);
  const multi = actions.find(({ name }) => /^multiattacco/i.test(name));
  const traits = plain(sheet.tratti || "");
  const resistance = /Resistenza leggendaria\s*\((\d+)\s*\/\s*giorno/i.exec(traits);
  const defences = normalize(`${sheet.resistenze || ""} ${sheet.immunita_danni || ""} ${(sheet.immunita || "").split(";")[0]}`);
  const lists = [...attacks.map(attack => attack.bonus)];
  const dcs = abilities.map(ability => ability.dc);
  const legend = legendary(sheet.azioni_leggendarie || "", attacks);
  return {
    name: sheet.nome,
    cr: Number(sheet.gs_num) || 0,
    ac: firstNumber(sheet.classe_armatura),
    hp: firstNumber(sheet.punti_ferita),
    saves: savingThrows(sheet),
    attacks,
    multiattack: multi ? multiattackCount(multi.text) : 1,
    abilities,
    legendary: legend,
    legendaryResistance: resistance ? Number(resistance[1]) : 0,
    magicResistance: /Resistenza alla magia/i.test(traits),
    weaponResistance: ["contundent", "perforant", "taglient"].every(word => defences.includes(word)),
    simulable: attacks.length > 0 || abilities.length > 0,
    toHit: lists.length ? Math.max(...lists) : null,
    dc: dcs.length ? Math.max(...dcs) : null,
  };
}
