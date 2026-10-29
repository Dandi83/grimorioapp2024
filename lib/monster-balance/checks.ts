import { BAND, quantile, type Comparison, type ReferenceRow } from "./compare";
import { entries, plain, type MonsterModel, type SheetFields } from "./parse";
import type { Measures } from "./scenarios";

/**
 * What the CR does not measure (PROMPT 19): warnings with a plain sentence and the data that raised them. They never
 * change the verdict. a: heavy control without a new saving throw; b: a character down in one turn more often than the
 * SRD monsters; c: alone without enough actions; d: few answers for the characters; e: numbers out of scale for the CR;
 * and the test situations (other groups and levels) where the monster does much worse than the SRD ones.
 */
export type WarningKind = "controllo" | "colpo" | "azioni" | "contromosse" | "numeri" | "prova";
export type BalanceWarning = {
  kind: WarningKind;
  /** A stable name of the warning, for the counts of the report (e.g. «numeri:ca-alta»). */
  key: string;
  text: string;
  /** The data that raised it. */
  data: string;
  /** Stronger: heavy control at CR 4 or less. */
  strong?: boolean;
};

const CONDITIONS: [RegExp, string][] = [
  [/paralizzat/i, "paralizzato"], [/pietrificat/i, "pietrificato"], [/stordit/i, "stordito"],
  [/priv[oa] di sensi/i, "privo di sensi"], [/incapacitat/i, "incapacitato"],
];
/** A new saving throw: «ripete il tiro salvezza» (2024), «può ripetere il tiro salvezza» (2014). */
const REPEAT = /ripet\w*\s+(?:il\s+|un\s+)?tiro salvezza|ripete il TS|alla fine di ciascun[oa] dei suoi turni/i;
/** The effect is on another creature: an attack, a saving throw, a target. */
const ON_TARGET = /tiro salvezza|Colpito:|bersaglio|creatura/i;
/** Not a condition put on someone: what the monster cannot suffer, or its own state. */
const NOT_INFLICTED = new RegExp([
  "non può essere (?:paralizzat|pietrificat|stordit|incapacitat)",
  // A requirement about someone else («un alleato … che non sia incapacitato», «a meno che non sia incapacitato»).
  "non (?:sia|è|siano|sono|fosse) (?:incapacitat|priv[oa] di sensi)",
  // A list of states the target must be in («afferrato, incapacitato o trattenuto»).
  "incapacitat\\w* o trattenut", "afferrat\\w*,? (?:da \\S+ )?incapacitat",
  "che sia incapacitat", "non (?:abbia|ha) la condizione (?:incapacitat|priv)",
  // The monster's own state or weakness («se il cavaliere è incapacitato», «campo anti-magia»).
  "se (?:\\S+ ){0,2}(?:è|sia) (?:incapacitat|priv[oa] di sensi)", "anti-?magia",
  // A character already at 0 hit points (stable, then paralysed): out of the fight anyway.
  "a 0 punti ferita|punti ferita del bersaglio a 0|è stabile",
].join("|"), "i");
/** A short effect, over by the next turn: not a lock. */
const SHORT = /fino (?:al termine|alla fine|all['’]inizio) del (?:(?:proprio|suo|tuo) )?(?:turno successivo|prossimo turno)/i;

const crLabel = (cr: number) => (cr === 0.125 ? "1/8" : cr === 0.25 ? "1/4" : cr === 0.5 ? "1/2" : String(cr));

/** a. Paralysed, petrified, stunned, unconscious or incapacitated without a new saving throw. */
export function heavyControl(sheet: SheetFields): { condition: string; name: string }[] {
  const found: { condition: string; name: string }[] = [];
  for (const block of [sheet.azioni, sheet.azioni_bonus, sheet.azioni_leggendarie, sheet.reazioni, sheet.tratti]) {
    for (const { name, text } of entries(block || "")) {
      if (!ON_TARGET.test(text) || REPEAT.test(text) || /anti-?magia/i.test(name)) continue;
      // The condition in a sentence that puts it on a target for longer than a turn.
      const sentences = text.split(/(?<=\.)\s+/).filter(sentence => !NOT_INFLICTED.test(sentence) && !SHORT.test(sentence));
      const condition = CONDITIONS.find(([pattern]) => sentences.some(sentence => pattern.test(sentence)));
      if (condition) found.push({ condition: condition[1], name: name.replace(/\.\s*$/, "") || "un’azione" });
    }
  }
  return found;
}

/** The conditions the monster is immune to: 2014 and homebrew in their own field, 2024 after «;» in «Immunità». */
export function conditionImmunities(sheet: SheetFields): string[] {
  const text = plain(sheet.immunita_condizioni || (sheet.immunita || "").split(";").slice(1).join(";"));
  return text.split(/,|\s+e\s+/).map(item => item.trim()).filter(Boolean);
}

const hasEntries = (html?: string) => entries(html || "").some(entry => entry.name || entry.text);

function scale(label: string, key: string, value: number | null, values: (number | null)[], cr: number): BalanceWarning[] {
  const known = values.filter((item): item is number => typeof item === "number").sort((a, b) => a - b);
  if (value === null || known.length < 3) return [];
  const low = Math.round(quantile(known, BAND.low)), high = Math.round(quantile(known, BAND.high)), median = Math.round(quantile(known, 0.5));
  if (value >= low && value <= high) return [];
  const above = value > high;
  return [{
    kind: "numeri", key: `numeri:${key}-${above ? "alta" : "bassa"}`,
    text: `${label} ${above ? "alta" : "bassa"} per il GS ${crLabel(cr)}`,
    data: `${label} ${value}: di solito ${median} (fascia ${low}–${high})`,
  }];
}

export function balanceWarnings(sheet: SheetFields, model: MonsterModel, comparison: Comparison, measures?: Measures): BalanceWarning[] {
  const warnings: BalanceWarning[] = [];
  const cr = model.cr, group: ReferenceRow[] = comparison.group;
  // a. Heavy control.
  for (const { condition, name } of heavyControl(sheet)) {
    const strong = cr <= 4;
    warnings.push({
      kind: "controllo", key: `controllo:${condition}`, strong,
      text: strong ? `Può lasciare un personaggio ${condition} senza un nuovo tiro salvezza: a GS ${crLabel(cr)} è molto pesante` : `Può lasciare un personaggio ${condition} senza un nuovo tiro salvezza`,
      data: `«${name}»`,
    });
  }
  // b. A character from full hit points to 0 in one turn of the monster, more often than the SRD monsters of its CR.
  if (measures) {
    const own = measures.tactics.ottimale.oneShotPct;
    const values = group.map(row => row.tactics.ottimale.oneShotPct).sort((a, b) => a - b);
    const high = quantile(values, BAND.high);
    if (own > 0 && own > high) warnings.push({
      kind: "colpo", key: "colpo", text: "Può abbattere un personaggio in un colpo solo",
      data: `nel ${own}% dei combattimenti un PG passa da pieno a 0 in un turno (mostri SRD del suo GS: fino al ${(Math.round(high * 10) / 10).toLocaleString("it-IT")}%)`,
    });
  }
  // c. Economy of actions: CR 5 or more alone with one action a turn.
  const multiattack = entries(sheet.azioni || "").some(({ name }) => /^multiattacco/i.test(name));
  if (cr >= 5 && !multiattack && !hasEntries(sheet.azioni_bonus) && !hasEntries(sheet.azioni_leggendarie)) warnings.push({
    kind: "azioni", key: "azioni", text: "Da solo rischia di essere sopraffatto: meglio con alleati",
    data: `GS ${crLabel(cr)} senza multiattacco, azioni bonus o azioni leggendarie`,
  });
  // d. Few answers for the characters.
  if (model.weaponResistance && cr <= 8) warnings.push({
    kind: "contromosse", key: "contromosse:armi", text: "Poche contromosse: resiste ai danni contundenti, perforanti e taglienti",
    data: `GS ${crLabel(cr)}: un gruppo senza armi magiche lo ferisce a metà`,
  });
  const immunities = conditionImmunities(sheet);
  if (immunities.length >= 6) warnings.push({
    kind: "contromosse", key: "contromosse:condizioni", text: `Poche contromosse: immune a ${immunities.length} condizioni`,
    data: immunities.join(", "),
  });
  if (model.magicResistance && model.legendaryResistance > 0 && cr <= 10) warnings.push({
    kind: "contromosse", key: "contromosse:magia", text: "Poche contromosse: resistenza alla magia e resistenze leggendarie",
    data: `GS ${crLabel(cr)}, ${model.legendaryResistance} resistenze leggendarie`,
  });
  // e. Numbers out of the band of the SRD monsters of the same CR.
  warnings.push(
    ...scale("CA", "ca", model.ac, group.map(row => row.ac), cr),
    ...scale("Bonus per colpire", "colpire", model.toHit, group.map(row => row.toHit), cr),
    ...scale("CD", "cd", model.dc, group.map(row => row.dc), cr),
  );
  // The test situations.
  for (const stress of comparison.stress) for (const note of stress.warnings) warnings.push({
    kind: "prova", key: `prova:${stress.key}:${/sterminato/.test(note) ? "sterminato" : /resiste/.test(note) ? "round" : "vittorie"}`,
    text: stress.label, data: note,
  });
  return warnings;
}
