import data from "./data/srd-conditions-5.2.1-it.json";
import type { ManualEntry } from "./manual-types";
export const conditions = data as ManualEntry[];
const forms: Record<string, string> = {
  Accecato: "accec at", Affascinato: "affascin at", Afferrato: "afferr at", Assordato: "assord at", Avvelenato: "avvelen at",
  Incapacitato: "incapacit at", Paralizzato: "paralizz at", Pietrificato: "pietrific at", Prono: "pron", Spaventato: "spavent at", Stordito: "stord it", Trattenuto: "tratten ut",
};
function pattern(title: string) {
  if (title === "Privo di sensi") return "priv[oaie]\\s+di\\s+sensi";
  if (title === "Invisibile") return "invisibil[ei]";
  if (title === "Indebolimento") return "indebolimento";
  return (forms[title] || title).replace(/ /g, "") + "[oaie]";
}
const matchers = conditions.map(condition => ({condition, regex: new RegExp("(?:^|[^\\p{L}])(?:" + pattern(condition.title) + ")(?=$|[^\\p{L}])", "iu")}));
export function findConditions(text: string) {
  const plain = text.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
  return matchers.filter(({regex}) => regex.test(plain)).map(({condition}) => condition);
}
