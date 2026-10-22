import armorData from "./data/srd-armor-it.json";
import manualData from "./data/srd-manual-5.2.1-it.json";
import type { ArmorCategory, ArmorChip, ArmorListEdition, ArmorListItem, ArmorTimes, EquipmentEdition } from "./equipment-types";

/**
 * Armor of the SRD 5.1 (2014) and SRD 5.2.1 (2024), read from the project files only.
 * Rule texts are quoted word for word: 2014 from srd-armor-it.json, 2024 from the 2024 manual.
 */

type RawArmor = (typeof armorData.armature)[number]["2014"];
interface RuleText { testo: string; page: number }

export interface ArmorEditionView {
  /** The name printed in the table (rule texts are found by it, also when the shown name is corrected). */
  nomeStampato: string;
  edition: EquipmentEdition;
  nome: string;
  /** As printed: "12 + modificatore di Des (max 2)", "16", "+2". */
  caTesto: string;
  costo: string;
  peso: string;
  /** "13" from "For 13". */
  forza?: string;
  furtivitaSvantaggio: boolean;
  page: number;
}

export interface ArmorRuleCard { title: string; detail?: string; text: string; page: number }

export interface Armor {
  id: string;
  categoria: ArmorCategory;
  editions: Record<EquipmentEdition, ArmorEditionView>;
}

function view(raw: RawArmor, edition: EquipmentEdition): ArmorEditionView {
  const strength = /\d+/.exec(raw.forza)?.[0];
  return {
    edition, nome: raw.nome, nomeStampato: raw.nome, caTesto: raw.ca, costo: raw.costo, peso: raw.peso,
    ...(strength ? { forza: strength } : {}), furtivitaSvantaggio: raw.furtivita === "Svantaggio", page: raw.page,
  };
}

export const armorSources = armorData.fonti;
export const armors: Armor[] = armorData.armature.map(item => ({
  id: item.id,
  categoria: item.categoria as ArmorCategory,
  editions: { "2014": view(item["2014"], "2014"), "2024": view(item["2024"], "2024") },
}));

export function getArmor(id: string, list: Armor[] = armors) {
  return list.find(armor => armor.id === id);
}

/**
 * Badge from the printed AC: "11" over "+ Des", "12" over "+ Des / max 2", "16" alone, "+2" alone.
 * The chips carry only what the badge does not say: "For 13", "Furtività: svantaggio".
 */
export function armorBadge(armor: ArmorEditionView): Pick<ArmorListEdition, "ca" | "caNote" | "chips"> {
  const chips: ArmorChip[] = [];
  if (armor.forza) chips.push({ kind: "strength", label: `For ${armor.forza}` });
  if (armor.furtivitaSvantaggio) chips.push({ kind: "stealth", label: "Furtività: svantaggio" });
  const max = /\(max (\d+)\)/.exec(armor.caTesto)?.[1];
  const caNote = /modificatore di Des/.test(armor.caTesto) ? ["+ Des", ...(max ? [`max ${max}`] : [])] : [];
  return { ca: /^[+\d]+/.exec(armor.caTesto)?.[0] ?? armor.caTesto, caNote, chips };
}

/**
 * The sheet writes the AC once: the badge holds the number and "CA", this line the rest of the
 * printed value, if any ("+ modificatore di Destrezza (max 2)"); fixed AC and the shield have none.
 */
export function armorClassRest(armor: ArmorEditionView): string | undefined {
  const rest = armor.caTesto.replace(/^[+\d]+\s*/, "");
  return rest ? rest.replace(/modificatore di Des\b/, "modificatore di Destrezza") : undefined;
}

/** Times of each category as printed: 2014 table "Indossare e togliere armature", 2024 table headers. */
export const armorTimes: ArmorTimes = {
  "2014": armorData.tempi["2014"].map(t => `Indossare ${t.indossare} · togliere ${t.togliere}`),
  "2024": armorData.tempi["2024"].map(t => t.indossare === t.togliere ? `Indossare o togliere: ${t.indossare}` : `Indossare ${t.indossare} · togliere ${t.togliere}`),
};

/** True when number, weight and cost are the same in both editions (only names differ). */
export const sameNumbers = armors.every(({ editions: { "2014": a, "2024": b } }) =>
  a.caTesto === b.caTesto && a.costo === b.costo && a.peso === b.peso && a.forza === b.forza && a.furtivitaSvantaggio === b.furtivitaSvantaggio);

export function armorListItems(list: Armor[] = armors): ArmorListItem[] {
  const listEdition = (armor: ArmorEditionView): ArmorListEdition => ({ nome: armor.nome, costo: armor.costo, peso: armor.peso, ...armorBadge(armor) });
  return list.map(armor => ({
    id: armor.id, categoria: armor.categoria,
    editions: { "2014": listEdition(armor.editions["2014"]), "2024": listEdition(armor.editions["2024"]) },
  }));
}

// 2024 rule texts: the manual entry "Armature". The four rules before and after the table are
// printed as labelled paragraphs ("Categoria.", "Forza."); the other rules sit under headings.
const manualArmor = manualData.entries.find(entry => entry.id === armorData.fonti["2024"].manuale)!;
const rules2024 = new Map<string, RuleText>();
{
  const labelled: { text: string; page: number }[] = [];
  let heading: string | undefined;
  for (const block of manualArmor.blocks) {
    if (block.kind === "heading") heading = block.text;
    else if (block.kind === "prose" && heading) rules2024.set(heading, { testo: [rules2024.get(heading)?.testo, block.text.trim()].filter(Boolean).join(" "), page: block.page });
    else if (block.kind === "prose") labelled.push({ text: block.text, page: block.page });
  }
  // The column break splits "Arma-tura" in the PDF text layer.
  const prose = labelled.slice(1).map(b => b.text.trim()).join(" ").replace(/\s+/g, " ").replace("Classe Arma tura", "Classe Armatura");
  const labels = ["Categoria", "Classe Armatura (CA)", "Forza", "Furtività"];
  labels.forEach((label, i) => {
    const start = prose.indexOf(`${label}. `), end = i + 1 < labels.length ? prose.indexOf(`${labels[i + 1]}. `) : prose.length;
    rules2024.set(label, { testo: prose.slice(start + label.length + 2, end).trim(), page: label === "Forza" || label === "Furtività" ? 105 : 104 });
  });
}

const rules2014 = armorData.regole2014 as unknown as Record<"generali" | "categorie" | "descrizioni" | "indossareTogliere", Record<string, RuleText>>;
const CATEGORY_2014 = ["Armature leggere", "Armature medie", "Armature pesanti"];

/** 2014 description of the single armor ("Imbottita. Un'armatura imbottita…"). */
export function armorDescription(armor: ArmorEditionView): RuleText | undefined {
  return armor.edition === "2014" ? rules2014.descrizioni[armor.nomeStampato] : undefined;
}

/** Rules that explain the sheet, in the text of the chosen edition. */
export function armorRuleCards(armor: ArmorEditionView, category: ArmorCategory): ArmorRuleCard[] {
  const cards: ArmorRuleCard[] = [];
  const times = armorTimes[armor.edition][category];
  const add = (title: string, rule: RuleText | undefined, detail?: string) => { if (rule?.testo) cards.push({ title, text: rule.testo, page: rule.page, ...(detail ? { detail } : {}) }); };
  if (armor.edition === "2014") {
    const general = rules2014.generali;
    if (category === 3) add("Scudi", general["Scudi"]);
    else add(CATEGORY_2014[category], rules2014.categorie[CATEGORY_2014[category]]);
    add("Classe Armatura (CA)", general["Classe Armatura (CA)"]);
    if (armor.forza) add("Forza", general["Armature pesanti"], `For ${armor.forza}`);
    if (armor.furtivitaSvantaggio) add("Furtività", general["Furtività"], "Svantaggio");
    add("Competenza", general["Competenza nelle armature"]);
    const donning = rules2014.indossareTogliere;
    if (donning["Indossare"] && donning["Togliere"]) cards.push({ title: "Indossare e togliere", detail: times, text: `${donning["Indossare"].testo}\n\n${donning["Togliere"].testo}`, page: 71 });
  } else {
    if (category === 3) cards.push({ title: "Indossare e togliere", detail: times, text: `Scudo (${armorData.tempi["2024"][3].testo}).`, page: 104 });
    else add("Categoria", rules2024.get("Categoria"), times);
    add("Classe Armatura (CA)", rules2024.get("Classe Armatura (CA)"));
    if (armor.forza) add("Forza", rules2024.get("Forza"), `For ${armor.forza}`);
    if (armor.furtivitaSvantaggio) add("Furtività", rules2024.get("Furtività"), "Svantaggio");
    add("Competenza", rules2024.get(category === 3 ? "Scudo" : "Leggera, media o pesante"));
    add("Una alla volta", rules2024.get("Una alla volta"));
  }
  return cards;
}
