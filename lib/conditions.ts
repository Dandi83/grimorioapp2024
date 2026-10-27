import data from "./data/srd-conditions-5.2.1-it.json";
import legacyData from "./data/srd-conditions-5.1-it.json";
import translatedData from "./data/srd-conditions-5.1-traduzione.json";
import type { ManualEntry } from "./manual-types";
export const conditions = data as ManualEntry[];
/**
 * The 15 conditions of the 2014 rules, A–Z: the 11 printed in the Italian SRD 5.1, and Prono, Spaventato, Stordito
 * and Trattenuto, missing there, in our translation of the English SRD 5.1 (fonte «traduzione-nostra»).
 */
export const legacyConditions = [...legacyData, ...translatedData as ManualEntry[]]
  .sort((a, b) => a.title.localeCompare(b.title, "it")) as ManualEntry[];
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

/** All gender/number forms, sharing the same condition detail destination. */
function inlineReferences(entries: ManualEntry[]) {
  return entries.flatMap(condition => {
    const title = condition.title;
    const labels = title === "Privo di sensi"
      ? ["privo", "priva", "privi", "prive"].map(form => `${form} di sensi`)
      : title === "Invisibile" ? ["invisibile", "invisibili"]
      : title === "Indebolimento" ? ["indebolimento"]
      : ["o", "a", "i", "e"].map(ending => (forms[title] || title).replace(/ /g, "") + ending);
    return labels.map(label => ({ label, href: `/manuale/${condition.id}` }));
  });
}
export const inlineConditionReferences = inlineReferences(conditions);
/** 2014 sheets link only to 2014 definitions. */
export const legacyInlineConditionReferences = inlineReferences(legacyConditions);
