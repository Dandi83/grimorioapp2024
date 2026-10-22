/**
 * Sections whose cards can be corrected by hand from the admin area («Modifica tutto»).
 *
 * The project files in lib/data are NEVER changed: a correction is a row of the database
 * (lib/content-overrides.ts) applied over the original value when a page is shown
 * (lib/corrected-content.ts). The fidelity checks keep comparing the original files.
 *
 * HOW TO ADD A SECTION: add ONE entry to CONTENT_SECTIONS below with
 *   - key / title / hint: the address /admin/contenuti/<key>, the tile title and its line;
 *   - editions: the editions the section has;
 *   - fields: one FieldSpec per editable printed value (kind decides the check: dice, currency…);
 *   - locked: data shown on the card that cannot be corrected here, and why;
 *   - items(edition): the cards of the list (id, name, short label), from the project files;
 *   - original(id, edition): the printed values of the editable fields, from the project files;
 *   - href(id, edition): the public page; paths(id): the pages to refresh after a change.
 * Then apply the corrections where the section's pages read their data (lib/corrected-content.ts).
 * Pure module (no database): the admin pages, the Server Actions and the tests share it.
 */
import { WEAPON_EDITABLE_FIELDS, weaponOriginal, weapons } from "./equipment";
import type { EquipmentEdition } from "./equipment-types";
import type { FieldSpec } from "./content-validate";

export type ContentEdition = EquipmentEdition;

export interface SectionItem { id: string; nome: string; etichetta: string }

export interface SectionSpec {
  key: string;
  title: string;
  /** Line under the tile title in /admin. */
  hint: string;
  editions: readonly ContentEdition[];
  fields: FieldSpec[];
  locked: { label: string; why: string }[];
  items(edition: ContentEdition): SectionItem[];
  original(id: string, edition: ContentEdition): Record<string, string> | undefined;
  href(id: string, edition: ContentEdition): string;
  paths(id: string): string[];
}

const WEAPON_KIND = ["Semplice · mischia", "Semplice · distanza", "Da guerra · mischia", "Da guerra · distanza"];

const WEAPON_FIELDS: Record<(typeof WEAPON_EDITABLE_FIELDS)[number], FieldSpec> = {
  nome: { name: "nome", label: "Nome", kind: "text", max: 80 },
  danni: { name: "danni", label: "Danni", kind: "dice", max: 20, optional: true, hint: "Vuoto per le armi senza danni (Rete)." },
  tipoDanno: { name: "tipoDanno", label: "Tipo di danno", kind: "text", max: 40, optional: true },
  costo: { name: "costo", label: "Costo", kind: "currency", max: 20 },
  peso: { name: "peso", label: "Peso", kind: "weight", max: 20 },
  proprieta: { name: "proprieta", label: "Proprietà", kind: "list", max: 300, optional: true, hint: "Separate da virgole, come nella tabella: «Lancio (gittata 6/18), Leggera». La gittata si ricava da qui." },
  padronanza: { name: "padronanza", label: "Padronanza", kind: "text", max: 40, hint: "Solo 2024: il nome della padronanza (il suo testo viene dal Manuale)." },
};

export const CONTENT_SECTIONS: SectionSpec[] = [
  {
    key: "armi",
    title: "Armi",
    hint: "Modifica proprietà",
    editions: ["2024", "2014"],
    fields: WEAPON_EDITABLE_FIELDS.map(name => WEAPON_FIELDS[name]),
    locked: [
      { label: "Testi delle proprietà e delle padronanze", why: "sono regole comuni a tutte le armi, nel Manuale: si correggono nella sezione Manuale" },
      { label: "Gittata", why: "si ricava dalla proprietà Lancio o Munizioni" },
      { label: "Pagina della fonte", why: "è il riferimento al PDF originale" },
      { label: "Confronto 2014 → 2024", why: "è calcolato dai valori mostrati" },
    ],
    items: edition => weapons.filter(weapon => weapon.editions[edition]).map(weapon => ({ id: weapon.id, nome: weapon.editions[edition]!.nome, etichetta: WEAPON_KIND[weapon.gruppo] }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "it")),
    original: (id, edition) => weaponOriginal(id, edition) as Record<string, string> | undefined,
    href: (id, edition) => `/equipaggiamento/armi/${id}${edition === "2014" ? "?edizione=2014" : ""}`,
    paths: id => ["/equipaggiamento/armi", `/equipaggiamento/armi/${id}`],
  },
];

export function sectionSpec(key: string): SectionSpec | undefined {
  return CONTENT_SECTIONS.find(section => section.key === key);
}

/** The fields of one card in one edition: only those the card prints (2014 weapons have no mastery). */
export function cardFields(section: SectionSpec, original: Record<string, string>): FieldSpec[] {
  return section.fields.filter(field => field.name in original);
}

export function isContentEdition(value: unknown): value is ContentEdition {
  return value === "2014" || value === "2024";
}
