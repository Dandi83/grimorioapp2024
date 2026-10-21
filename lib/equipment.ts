import weaponsData from "./data/srd-weapons-it.json";
import manualData from "./data/srd-manual-5.2.1-it.json";
import type { EquipmentEdition, WeaponGroup, WeaponListEdition, WeaponListItem } from "./equipment-types";

/**
 * Weapons of the SRD 5.1 (2014) and SRD 5.2.1 (2024), read from the project files only.
 * Rule texts are quoted word for word: 2014 from srd-weapons-it.json, 2024 from the 2024 manual.
 */

type RawWeapon = NonNullable<(typeof weaponsData.armi)[number]["2014" | "2024"]>;

export interface WeaponProperty {
  key: string;
  /** As printed, first letter capitalized: "Due mani", "Lancio". */
  label: string;
  /** Text in brackets: "gittata 6/18", "1d8", "eccetto in sella". */
  detail?: string;
}

export interface WeaponEditionView {
  edition: EquipmentEdition;
  nome: string;
  danni: string;
  tipoDanno: string;
  costo: string;
  peso: string;
  /** "6/18 m" for thrown and ammunition weapons. */
  gittata?: string;
  proprieta: WeaponProperty[];
  /** The printed Proprietà cell. */
  proprietaTesto: string;
  padronanza?: string;
  page: number;
}

export interface RuleCard { label: string; detail?: string; text: string }

export interface CompareRow { label: string; before: string; after: string; changed: boolean }

const slug = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "Accurata, lancio (gittata 6/18), leggera" → three properties; commas inside brackets do not split. */
export function parseProperties(printed: string): WeaponProperty[] {
  if (!printed || printed === "—") return [];
  return printed.split(/,\s*(?![^()]*\))/).map(part => {
    const match = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(part.trim());
    const label = capitalize((match ? match[1] : part).trim());
    return { key: slug(label), label, ...(match ? { detail: match[2].trim() } : {}) };
  });
}

function range(properties: WeaponProperty[]) {
  const detail = properties.find(property => property.key === "lancio" || property.key === "munizioni")?.detail;
  const value = detail && /gittata\s+([\d,]+\/[\d,]+)/.exec(detail)?.[1];
  return value ? `${value} m` : undefined;
}

function view(raw: RawWeapon, edition: EquipmentEdition): WeaponEditionView {
  const proprieta = parseProperties(raw.proprieta);
  return {
    edition, nome: raw.nome, danni: raw.danni, tipoDanno: raw.tipoDanno, costo: raw.costo, peso: raw.peso,
    gittata: range(proprieta), proprieta, proprietaTesto: raw.proprieta, page: raw.page,
    ...("padronanza" in raw && raw.padronanza ? { padronanza: masteryLabel(String(raw.padronanza)) } : {}),
  };
}

// 2024 rule texts: the prose under each heading of the manual entry "Armi" (sidebars excluded).
const manualWeapons = manualData.entries.find(entry => entry.id === weaponsData.fonti["2024"].manuale)!;
const manualSections = new Map<string, string>();
{
  let heading: string | undefined;
  for (const block of manualWeapons.blocks) {
    if (block.kind === "heading") heading = block.text;
    else if (block.kind === "prose" && heading) manualSections.set(heading, [manualSections.get(heading), block.text].filter(Boolean).join(" "));
  }
}
const MANUAL_PROPERTY_HEADINGS: Record<string, string> = {
  accurata: "Accurata", "due-mani": "A due mani", gittata: "Gittata", lancio: "Lancio", leggera: "Leggera",
  munizioni: "Munizioni", pesante: "Pesante", portata: "Portata", ricarica: "Ricarica", versatile: "Versatile",
};
const masteries = new Map([...manualSections.keys()].map(heading => [heading.toLowerCase(), heading]));
/** The mastery as titled in the 2024 rules ("Colpo di striscio"; the table once prints "Striscio"). */
function masteryLabel(printed: string) {
  return masteries.get(printed.toLowerCase()) ?? printed;
}

const rules2014 = weaponsData.regole2014.proprieta as Record<string, { testo: string }>;
const special2014 = weaponsData.regole2014.armiSpeciali as Record<string, { testo: string }>;
const LABEL_2014: Record<string, string> = { accurata: "Accurata", "due-mani": "Due mani", gittata: "Gittata", lancio: "Lancio", leggera: "Leggera", munizioni: "Munizioni", pesante: "Pesante", portata: "Portata", ricarica: "Ricarica", speciale: "Speciale", versatile: "Versatile" };

export function propertyText(edition: EquipmentEdition, key: string): string | undefined {
  return edition === "2014" ? rules2014[LABEL_2014[key]]?.testo : manualSections.get(MANUAL_PROPERTY_HEADINGS[key]);
}
export function masteryText(label: string): string | undefined {
  return manualSections.get(label);
}

/** One card per property, plus "Gittata" for weapons with a range; texts of the chosen edition. */
export function propertyCards(weapon: WeaponEditionView): RuleCard[] {
  const cards = weapon.proprieta.map(property => ({
    label: property.label,
    detail: property.key === "versatile" ? `${property.detail} a due mani` : property.key === "lancio" || property.key === "munizioni" ? property.detail : property.detail,
    text: propertyText(weapon.edition, property.key) ?? "",
  }));
  if (weapon.gittata) cards.push({ label: "Gittata", detail: weapon.gittata, text: propertyText(weapon.edition, "gittata") ?? "" });
  return cards;
}

/** SRD 5.1 "Armi speciali": the lance and the net have rules of their own. */
export function specialRule(weapon: WeaponEditionView): string | undefined {
  return weapon.edition === "2014" ? special2014[weapon.nome]?.testo : undefined;
}

export const weaponSources = weaponsData.fonti;

export interface Weapon {
  id: string;
  gruppo: WeaponGroup;
  editions: Partial<Record<EquipmentEdition, WeaponEditionView>>;
}

export const weapons: Weapon[] = weaponsData.armi.map(item => ({
  id: item.id,
  gruppo: item.gruppo as WeaponGroup,
  editions: {
    ...(item["2014"] ? { "2014": view(item["2014"] as RawWeapon, "2014") } : {}),
    ...(item["2024"] ? { "2024": view(item["2024"] as RawWeapon, "2024") } : {}),
  },
}));

export function getWeapon(id: string) {
  return weapons.find(weapon => weapon.id === id);
}

// Comparison 2014 → 2024, computed from the data: the ammunition kind printed only in 2024
// ("; freccia") and the capital letters are not differences.
const comparable = (property: WeaponProperty) => `${property.key}${property.detail ? ` (${property.detail.replace(/;.*$/, "").toLowerCase()})` : ""}`;
const versatile = (weapon?: WeaponEditionView) => weapon?.proprieta.find(property => property.key === "versatile")?.detail ?? "—";
const others = (weapon?: WeaponEditionView) => (weapon?.proprieta ?? []).filter(property => property.key !== "versatile").map(comparable);

export function compareWeapon(weapon: Weapon): { rows: CompareRow[]; note?: string; changed: boolean } {
  const before = weapon.editions["2014"], after = weapon.editions["2024"];
  if (!before) return { rows: [], note: "Nuova nel 2024", changed: true };
  if (!after) return { rows: [], note: "Non presente nella tabella 2024", changed: true };
  const props = (w: WeaponEditionView) => w.proprieta.map(p => p.label + (p.detail ? ` (${p.detail.replace(/;.*$/, "")})` : "")).join(", ") || "—";
  const rows: CompareRow[] = [
    { label: "Danni", before: before.danni || "—", after: after.danni || "—", changed: before.danni !== after.danni },
    { label: "Versatile", before: versatile(before), after: versatile(after), changed: versatile(before) !== versatile(after) },
    { label: "Padronanza", before: "—", after: after.padronanza ?? "—", changed: false },
    { label: "Peso", before: before.peso, after: after.peso, changed: before.peso !== after.peso },
    { label: "Proprietà", before: props(before), after: props(after), changed: others(before).join("|") !== others(after).join("|") },
  ];
  const changed = rows.some(row => row.changed);
  const parts: string[] = [];
  if (before.danni !== after.danni) parts.push(`Dado: ${before.danni} → ${after.danni}`);
  if (versatile(before) !== versatile(after)) parts.push(`Versatile: ${versatile(before)} → ${versatile(after)}`);
  if (before.peso !== after.peso) parts.push(`Peso: ${before.peso} → ${after.peso}`);
  if (before.gittata !== after.gittata) parts.push(`Gittata: ${before.gittata ?? "—"} → ${after.gittata ?? "—"}`);
  const was = new Set(others(before).map(p => p.replace(/ \(.*$/, ""))), now = new Set(others(after).map(p => p.replace(/ \(.*$/, "")));
  const added = after.proprieta.filter(p => p.key !== "versatile" && !was.has(p.key)).map(p => p.label.toLowerCase() + (p.detail ? ` (${p.detail})` : ""));
  const removed = before.proprieta.filter(p => p.key !== "versatile" && !now.has(p.key)).map(p => p.label.toLowerCase());
  if (added.length) parts.push(`ora ${added.join(", ")}`);
  if (removed.length) parts.push(`non più ${removed.join(", ")}`);
  return { rows: changed ? rows.filter(row => row.changed || row.label === "Padronanza") : [], note: parts.length ? parts.join(" · ") : undefined, changed };
}

const shortProperty = (property: WeaponProperty) =>
  property.key === "lancio" || property.key === "munizioni"
    ? `${property.label} ${/gittata\s+([^;)]+)/.exec(property.detail ?? "")?.[1] ?? ""}`.trim()
    : property.detail ? `${property.label} (${property.detail})` : property.label;

function listEdition(weapon?: WeaponEditionView): WeaponListEdition | undefined {
  if (!weapon) return undefined;
  return {
    nome: weapon.nome, danni: weapon.danni, tipoDanno: weapon.tipoDanno, costo: weapon.costo, peso: weapon.peso,
    proprieta: weapon.proprieta.map(shortProperty), ...(weapon.padronanza ? { padronanza: weapon.padronanza } : {}),
  };
}

/** Light rows for the lists: no rule texts. */
export function weaponListItems(): WeaponListItem[] {
  return weapons.map(weapon => {
    const { changed, note } = compareWeapon(weapon);
    return {
      id: weapon.id, gruppo: weapon.gruppo,
      editions: {
        ...(weapon.editions["2014"] ? { "2014": listEdition(weapon.editions["2014"]) } : {}),
        ...(weapon.editions["2024"] ? { "2024": listEdition(weapon.editions["2024"]) } : {}),
      },
      changed, ...(note ? { changeNote: note } : {}),
    };
  });
}
