import data from "./data/nomi-da-rivedere.json";

/**
 * «Nomi da rivedere» (reserved area): proper names and trademarks of the data file lib/data/nomi-da-rivedere.json
 * found in the name or text of a card. Whole words only («Melf», never «Melfi»), any case unless the entry asks for
 * a capital (Otto, also an Italian number). Pure: the server reads the cards (lib/review-names-server.ts).
 */
export interface ReviewName { nome: string; maiuscola?: boolean }

export const REVIEW_NAMES: readonly ReviewName[] = data.nomi;

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** One expression per name: letters and digits around it end the match, spaces and dashes inside it are interchangeable. */
const MATCHERS = REVIEW_NAMES.map(({ nome, maiuscola }) => ({
  nome,
  pattern: new RegExp(`(?<![\\p{L}\\p{N}])${nome.split(/[\s-]+/).map(escape).join("[\\s\\-]+")}(?![\\p{L}\\p{N}])`, maiuscola ? "u" : "iu"),
}));

/** The names of the file found in these texts, in the order of the file, each once. */
export function reviewNamesIn(texts: readonly string[]): string[] {
  const joined = texts.join("\n");
  return MATCHERS.filter(({ pattern }) => pattern.test(joined)).map(({ nome }) => nome);
}

/** Every text of a card: strings anywhere in its fields (traits, actions, lists), the id and the source label left out. */
export function cardTexts(card: object): string[] {
  const texts: string[] = [];
  const walk = (value: unknown, key?: string) => {
    if (key === "id" || key === "fonte_scheda") return;
    if (typeof value === "string") texts.push(value);
    else if (Array.isArray(value)) value.forEach(item => walk(item));
    else if (value && typeof value === "object") for (const [name, inner] of Object.entries(value)) walk(inner, name);
  };
  walk(card);
  return texts;
}
