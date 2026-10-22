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
import { armors } from "./armor";
import { gearEntries, gearHref } from "./adventuring-gear-editions";
import { conditions, legacyConditions } from "./conditions";
import {
  armorAdapter, classAdapter, gear2014Adapter, gear2024Adapter, magicItemAdapter, manualAdapter, tool2014Adapter, tool2024Adapter, type CardAdapter,
} from "./content-adapters";
import { classEntries, classHref } from "./classes";
import { WEAPON_EDITABLE_FIELDS, weaponOriginal, weapons } from "./equipment";
import { ARMOR_CATEGORY_NAMES, type EquipmentEdition } from "./equipment-types";
import type { FieldSpec } from "./content-validate";
import { magicItemEntries, magicItemEntryHref } from "./magic-items-editions";
import { manualEntries } from "./manual";
import type { ManualEntry } from "./manual-types";
import { toolEntries, toolHref } from "./tools-editions";

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
  /** The editable fields of one card when they depend on the card (paragraphs, blocks). */
  fieldsOf?(id: string, edition: ContentEdition): FieldSpec[];
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

const TEXT = (name: string, label: string, max: number, extra: Partial<FieldSpec> = {}): FieldSpec => ({ name, label, kind: "text", max, ...extra });
const LONG = (name: string, label: string, max: number, extra: Partial<FieldSpec> = {}): FieldSpec => ({ name, label, kind: "longtext", max, ...extra });

/**
 * A section whose cards are objects of the project data: the adapter turns each card into fields
 * (lib/content-adapters.ts); fixed fields have a spec here, paragraphs and blocks get one per card.
 */
function cardSection<T>(spec: Omit<SectionSpec, "original" | "fields" | "fieldsOf"> & {
  card(id: string, edition: ContentEdition): T | undefined;
  adapter(edition: ContentEdition): CardAdapter<T>;
  fixed: FieldSpec[];
  /** Spec of a dynamic field (paragrafo-N, blocco-N), given its label. */
  dynamic?: (name: string, label: string) => FieldSpec;
}): SectionSpec {
  const original = (id: string, edition: ContentEdition) => { const card = spec.card(id, edition); return card && spec.adapter(edition).read(card); };
  return {
    ...spec,
    fields: spec.fixed,
    original,
    fieldsOf: (id, edition) => {
      const card = spec.card(id, edition), values = original(id, edition);
      if (!card || !values) return [];
      return Object.keys(values).flatMap(name => {
        const fixed = spec.fixed.find(field => field.name === name);
        if (fixed) return [fixed];
        const label = spec.adapter(edition).label?.(card, name);
        return label && spec.dynamic ? [spec.dynamic(name, label)] : [];
      });
    },
  };
}

const withEdition = (href: string, edition: ContentEdition) => (edition === "2014" && !href.includes("?") ? `${href}?edizione=2014` : href);
const findGear = (id: string) => gearEntries.find(entry => entry.id === id);
const findTool = (id: string) => toolEntries.find(entry => entry.id === id);
const findMagic = (id: string) => magicItemEntries.find(entry => entry.id === id);
const byName = (a: SectionItem, b: SectionItem) => a.nome.localeCompare(b.nome, "it");
const conditionCards: Record<ContentEdition, ManualEntry[]> = { "2024": conditions, "2014": legacyConditions };
const manualCards = manualEntries.filter(entry => entry.category !== "condizioni");

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
  cardSection({
    key: "armature", title: "Armature", hint: "CA, requisiti", editions: ["2024", "2014"],
    fixed: [
      TEXT("nome", "Nome", 80),
      TEXT("caTesto", "Classe Armatura", 60, { hint: "Come nella tabella: «11 + modificatore di Des», «16», «+2»." }),
      { name: "costo", label: "Costo", kind: "currency", max: 20 },
      { name: "peso", label: "Peso", kind: "weight", max: 20 },
      { name: "forza", label: "Forza richiesta", kind: "number", max: 3, optional: true, hint: "Solo il numero (13, 15); vuoto se non serve." },
    ],
    locked: [
      { label: "Svantaggio a Furtività", why: "è un sì/no della tabella, non un testo" },
      { label: "Regole e descrizioni (indossare, categorie, scudi)", why: "sono testi comuni del Manuale" },
      { label: "Pagina della fonte", why: "è il riferimento al PDF originale" },
    ],
    card: (id, edition) => armors.find(armor => armor.id === id)?.editions[edition],
    adapter: () => armorAdapter,
    items: edition => armors.map(armor => ({ id: armor.id, nome: armor.editions[edition].nome, etichetta: ARMOR_CATEGORY_NAMES[armor.categoria] })).sort(byName),
    href: (id, edition) => withEdition(`/equipaggiamento/armature/${id}`, edition),
    paths: id => ["/equipaggiamento/armature", `/equipaggiamento/armature/${id}`],
  }),
  cardSection({
    key: "avventura", title: "Equipaggiamento", hint: "Oggetti d’avventura e dotazioni", editions: ["2024", "2014"],
    fixed: [TEXT("nome", "Nome", 100), TEXT("prezzo", "Costo", 80), TEXT("costo", "Costo", 40, { optional: true }), TEXT("peso", "Peso", 40, { optional: true })],
    dynamic: (name, label) => LONG(name, label, 4000),
    locked: [
      { label: "Tabelle (dotazioni, capienza, gruppi)", why: "sono tabelle stampate: si correggono con una correzione documentata" },
      { label: "Abbinamenti 2014 → 2024", why: "li ha decisi Daniele il 21 ottobre 2026 (file di correzioni)" },
      { label: "Pagina della fonte", why: "è il riferimento al PDF originale" },
    ],
    card: (id, edition) => findGear(id)?.editions[edition] as never,
    adapter: edition => (edition === "2024" ? gear2024Adapter : gear2014Adapter) as CardAdapter<never>,
    items: edition => gearEntries.filter(entry => entry.editions[edition]).map(entry => ({ id: entry.id, nome: entry.editions[edition]!.nome, etichetta: entry.editions[edition]!.dotazione ? "Dotazione" : "Oggetto" })).sort(byName),
    href: (id, edition) => { const entry = findGear(id); return entry ? withEdition(gearHref(entry, edition), entry.id2014 && edition === "2014" ? "2024" : edition) : "/equipaggiamento/avventura"; },
    paths: id => { const entry = findGear(id); return ["/equipaggiamento/avventura", `/equipaggiamento/avventura/${id}`, ...(entry?.id2014 ? [`/equipaggiamento/avventura/${entry.id2014}`] : [])]; },
  }),
  cardSection({
    key: "strumenti", title: "Strumenti", hint: "Strumenti, giochi, strumenti musicali", editions: ["2024", "2014"],
    fixed: [
      TEXT("nome", "Nome", 100), TEXT("prezzo", "Costo", 80), TEXT("costo", "Costo", 40), TEXT("caratteristica", "Caratteristica", 40), TEXT("peso", "Peso", 40),
      LONG("utilizzo", "Utilizzo", 2000), LONG("creazione", "Creazione", 1000, { optional: true, hint: "Un oggetto per riga." }),
    ],
    dynamic: (name, label) => LONG(name, label, 4000),
    locked: [
      { label: "Varianti (giochi, strumenti musicali) e loro costi", why: "sono righe di tabella condivise da più schede" },
      { label: "Testi introduttivi della sezione", why: "sono testi comuni del Manuale" },
      { label: "Pagina della fonte", why: "è il riferimento al PDF originale" },
    ],
    card: (id, edition) => findTool(id)?.editions[edition] as never,
    adapter: edition => (edition === "2024" ? tool2024Adapter : tool2014Adapter) as CardAdapter<never>,
    items: edition => toolEntries.filter(entry => entry.editions[edition]).map(entry => ({ id: entry.id, nome: entry.editions[edition]!.nome, etichetta: entry.editions[edition]!.gruppo })).sort(byName),
    href: (id, edition) => withEdition(toolHref(id), edition),
    paths: id => ["/equipaggiamento/strumenti", toolHref(id)],
  }),
  cardSection({
    key: "oggetti-magici", title: "Oggetti magici", hint: "Testi e tipo", editions: ["2024", "2014"],
    fixed: [TEXT("nome", "Nome", 100), TEXT("rigaTipo", "Riga del tipo", 200, { hint: "La riga in corsivo sotto il nome. Tipo, rarità e sintonia dei filtri non cambiano." })],
    dynamic: (name, label) => LONG(name, label, 6000),
    locked: [
      { label: "Tipo, rarità e sintonia usati dai filtri", why: "sono ricavati dalla riga stampata nei dati originali" },
      { label: "Tabelle e blocchi statistiche", why: "hanno righe e colonne: si correggono con una correzione documentata" },
      { label: "Pagine della fonte", why: "sono il riferimento al PDF originale" },
    ],
    card: (id, edition) => findMagic(id)?.editions[edition],
    adapter: () => magicItemAdapter,
    items: edition => magicItemEntries.filter(entry => entry.editions[edition]).map(entry => ({ id: entry.id, nome: entry.editions[edition]!.nome, etichetta: entry.editions[edition]!.rigaTipo })).sort(byName),
    href: (id, edition) => { const entry = findMagic(id); return entry ? withEdition(magicItemEntryHref(entry, edition), entry.id2014 && edition === "2014" ? "2024" : edition) : "/oggetti-magici"; },
    paths: id => { const entry = findMagic(id); return ["/oggetti-magici", `/oggetti-magici/${id}`, ...(entry?.id2014 ? [`/oggetti-magici/${entry.id2014}`] : [])]; },
  }),
  cardSection({
    key: "classi", title: "Classi", hint: "Privilegi e sottoclassi", editions: ["2024", "2014"],
    fixed: [TEXT("nome", "Nome", 40), TEXT("sottoclasse-nome", "Sottoclasse · nome", 80), TEXT("sottoclasse-motto", "Sottoclasse · motto", 200)],
    dynamic: (name, label) => (name.endsWith("-titolo") ? TEXT(name, label, 120) : name.startsWith("tratto-") ? TEXT(name, label, 600) : LONG(name, label, 8000)),
    locked: [
      { label: "Tabella dei privilegi, tabelle e riquadri", why: "hanno righe e colonne: si correggono con una correzione documentata" },
      { label: "Lista degli incantesimi", why: "è una tabella del Manuale; i singoli incantesimi si correggono nell’editor degli incantesimi" },
      { label: "Pagine della fonte", why: "sono il riferimento al PDF originale" },
    ],
    card: (id, edition) => classEntries.find(entry => entry.id === id)?.editions[edition],
    adapter: () => classAdapter,
    items: edition => classEntries.filter(entry => entry.editions[edition]).map(entry => ({ id: entry.id, nome: entry.editions[edition]!.nome, etichetta: entry.editions[edition]!.sottoclasse.nome })),
    href: (id, edition) => withEdition(classHref(id), edition),
    paths: id => ["/classi", classHref(id), "/compendio"],
  }),
  cardSection({
    key: "condizioni", title: "Condizioni", hint: "Testi 2014/2024", editions: ["2024", "2014"],
    fixed: [TEXT("title", "Nome", 60)],
    dynamic: (name, label) => LONG(name, label, 4000),
    locked: [{ label: "Pagina della fonte", why: "è il riferimento al PDF originale" }],
    card: (id, edition) => conditionCards[edition].find(entry => entry.id === id),
    adapter: () => manualAdapter,
    items: edition => conditionCards[edition].map(entry => ({ id: entry.id, nome: entry.title, etichetta: `Condizione ${edition}` })).sort(byName),
    href: id => `/manuale/${id}`,
    paths: id => ["/compendio/condizioni", `/manuale/${id}`],
  }),
  cardSection({
    key: "manuale", title: "Manuale", hint: "Voci e regole", editions: ["2024"],
    fixed: [TEXT("title", "Titolo", 120)],
    dynamic: (name, label) => LONG(name, label, 8000),
    locked: [
      { label: "Tabelle", why: "hanno righe e colonne: si correggono con una correzione documentata" },
      { label: "Testi delle voci di Equipaggiamento (Armi, Armature, Avventura, Strumenti)", why: "si correggono nelle loro sezioni" },
    ],
    card: id => manualCards.find(entry => entry.id === id),
    adapter: () => manualAdapter,
    items: () => manualCards.map(entry => ({ id: entry.id, nome: entry.title, etichetta: entry.subgroup })).sort(byName),
    href: id => `/manuale/${id}`,
    paths: id => ["/manuale", `/manuale/${id}`],
  }),
];

export function sectionSpec(key: string): SectionSpec | undefined {
  return CONTENT_SECTIONS.find(section => section.key === key);
}

/** The fields of one card in one edition: only those the card prints (2014 weapons have no mastery). */
export function cardFields(section: SectionSpec, original: Record<string, string>, id?: string, edition?: ContentEdition): FieldSpec[] {
  if (section.fieldsOf && id && edition) return section.fieldsOf(id, edition);
  return section.fields.filter(field => field.name in original);
}

export function isContentEdition(value: unknown): value is ContentEdition {
  return value === "2014" || value === "2024";
}

/** Labels of the fields of one card, for the note under a corrected public card. */
export function fieldLabels(sectionKey: string, id: string, edition: ContentEdition): Record<string, string> {
  const section = sectionSpec(sectionKey);
  const original = section?.original(id, edition);
  if (!section || !original) return {};
  return Object.fromEntries(cardFields(section, original, id, edition).map(field => [field.name, field.label]));
}
