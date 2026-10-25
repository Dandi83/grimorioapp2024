// Where «Concentrazione» in the Durata box of a spell card leads (lib/concentration.ts holds the rule texts).
// No data here: safe in the client code of the editor previews.

/** The page of the rule of the edition of the card. */
export function concentrationRuleHref(legacy: boolean): string {
  return legacy ? "/regole/concentrazione-2014" : "/regole/concentrazione";
}

/** «Concentrazione, fino a 1 minuto» → the word to link and the rest; undefined without concentration. */
export function splitConcentration(durata: string | null | undefined): { word: string; rest: string } | undefined {
  const match = /^\s*(concentrazione)\b([\s\S]*)$/i.exec(durata || "");
  return match ? { word: match[1], rest: match[2] } : undefined;
}
