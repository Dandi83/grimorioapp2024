/**
 * Index of the search in Home: name, short label and address of every public page, nothing else.
 *
 * HOW TO ADD A SECTION (Creati da noi, Cavalcature…): add ONE entry to SEARCH_SOURCES below with
 *   - section / title: the group and filter shown in the panel (an existing section, or a new
 *     SearchSectionKey in lib/search.ts);
 *   - rows(environment): the public pages of the section, each { nome, label, href, edizione? },
 *     the label derived from the data ("Invocazione · liv. 3"), never from the page text.
 * Rows of the two editions with the same name become one result that opens «la tua edizione»
 * (lib/user-edition.ts); a 2014-only row says "· 2014", and a row of one edition only is marked so
 * the panel shows the user's edition first. The index is served at /ricerca-indice.json, built with the
 * site (same lists as the catalogs, so every address exists) and saved offline by the service worker.
 */
import { conditionRows } from "./conditions-list";
import { gearListRows } from "./adventuring-gear-editions";
import { armorListItems } from "./armor";
import { classHref, hitDie, ofClass } from "./classes";
import { getCorrectedArmors, getCorrectedClasses, getCorrectedConditions, getCorrectedGear, getCorrectedMagicItems, getCorrectedManualEntries, getCorrectedTools, getCorrectedWeapons } from "./corrected-content";
import { weaponListItems } from "./equipment";
import { ARMOR_CATEGORY_NAMES, WEAPON_GROUP_NAMES, type EquipmentEdition } from "./equipment-types";
import { magicItemEditionRows } from "./magic-items-editions";
import { manualAvailable } from "./manual";
import { MANUAL_CATEGORIES } from "./manual-types";
import { getMonsterListIndex } from "./monster-index";
import { collectionOf, typeCategory } from "./monsters-types";
import { getSpellIndex } from "./spell-index";
import { spellName } from "./spell-name";
import { toolListRows } from "./tools-editions";
import { HOMEBREW_LABEL, fold, type SearchIndex, type SearchSectionKey } from "./search";
import { isHiddenPath, partId, sectionOfPath } from "./public-sections";

/** A row of a hidden section, or of a hidden edition, collection or tab (hidden: sections and part ids). */
function hiddenRow(row: SourceRow, hidden: readonly string[]): boolean {
  if (isHiddenPath(row.href, hidden)) return true;
  const section = sectionOfPath(row.href);
  return section !== undefined && [row.edizione, row.parte].some(part => part !== undefined && hidden.includes(partId(section, part)));
}

/** parte: the part of its section the row belongs to (a collection, a tab), hidden with it from /admin/sezioni. */
export interface SourceRow { nome: string; label: string; href: string; edizione?: EquipmentEdition; parte?: string }

export interface SearchSource {
  section: SearchSectionKey;
  title: string;
  rows: (environment: string | undefined) => SourceRow[] | Promise<SourceRow[]>;
}

const bothEditions = <T,>(list: Record<EquipmentEdition, T[]>, row: (item: T, edition: EquipmentEdition) => SourceRow) =>
  (["2024", "2014"] as const).flatMap(edition => list[edition].map(item => row(item, edition)));

export const SEARCH_SOURCES: SearchSource[] = [
  {
    section: "incantesimi", title: "Incantesimi",
    rows: async () => (await getSpellIndex()).map(spell => ({
      nome: spellName(spell.nome_italiano, spell.edizione),
      label: [spell.scuola, spell.livello_num === 0 ? "trucchetto" : spell.livello_num > 0 ? `liv. ${spell.livello_num}` : ""].filter(Boolean).join(" · "),
      href: `/spell/${spell.id}`, edizione: spell.edizione ?? "2024",
    })),
  },
  {
    section: "mostri", title: "Mostri",
    // Homebrew creatures: «Homebrew» first in the label (the panel shows it as the amber pill); «Entrambe» belongs to no single edition.
    rows: async () => (await getMonsterListIndex()).map(monster => ({
      nome: monster.nome,
      label: [monster.homebrew ? HOMEBREW_LABEL : "", typeCategory(monster.tipo) || monster.tipo, monster.grado_sfida ? `GS ${monster.grado_sfida}` : ""].filter(Boolean).join(" · "),
      href: `/mostro/${monster.id}`, ...(monster.entrambe ? {} : { edizione: monster.edizione }), parte: collectionOf(monster),
    })),
  },
  {
    // Classes and their subclass: the subclass opens the sheet on its tab.
    section: "classi", title: "Classi",
    rows: async () => (await getCorrectedClasses()).list.flatMap(entry => (["2024", "2014"] as const).flatMap(edition => {
      const card = entry.editions[edition];
      const page = `${classHref(entry.id)}${edition === "2014" ? "?edizione=2014" : ""}`;
      return card ? [
        { nome: card.nome, label: `Classe · ${hitDie(card)}`, href: page, edizione: edition },
        { nome: card.sottoclasse.nome, label: `Sottoclasse ${ofClass(card.nome)}`, href: `${page}#sottoclasse`, edizione: edition, parte: "tab-sottoclasse" },
      ] : [];
    })),
  },
  {
    section: "equipaggiamento", title: "Equipaggiamento",
    // Corrected names and costs (lib/corrected-content.ts): the search finds what the cards show.
    rows: async () => weaponListItems((await getCorrectedWeapons()).weapons).flatMap(weapon => (["2024", "2014"] as const).flatMap(edition => {
      const item = weapon.editions[edition];
      return item ? [{ nome: item.nome, label: `${WEAPON_GROUP_NAMES[weapon.gruppo]} · ${item.costo}`, href: `/equipaggiamento/armi/${weapon.id}`, edizione: edition }] : [];
    })),
  },
  {
    section: "equipaggiamento", title: "Equipaggiamento",
    rows: async () => armorListItems((await getCorrectedArmors()).list).flatMap(armor => (["2024", "2014"] as const).map(edition => ({
      nome: armor.editions[edition].nome, label: `${ARMOR_CATEGORY_NAMES[armor.categoria]} · ${armor.editions[edition].costo}`,
      href: `/equipaggiamento/armature/${armor.id}`, edizione: edition,
    }))),
  },
  {
    section: "equipaggiamento", title: "Equipaggiamento",
    rows: async () => bothEditions(gearListRows((await getCorrectedGear()).list), (row, edition) => ({
      nome: row.nome, label: [row.dotazione ? "Dotazione" : "Equipaggiamento d’avventura", row.prezzo].filter(Boolean).join(" · "), href: row.href, edizione: edition,
    })),
  },
  {
    section: "equipaggiamento", title: "Equipaggiamento",
    rows: async () => bothEditions(toolListRows((await getCorrectedTools()).list), (row, edition) => ({ nome: row.nome, label: [row.gruppo, row.costo].filter(Boolean).join(" · "), href: row.href, edizione: edition })),
  },
  {
    section: "oggetti-magici", title: "Oggetti magici",
    rows: async () => bothEditions(magicItemEditionRows((await getCorrectedMagicItems()).list), (row, edition) => ({ nome: row.nome, label: `${row.tipo} · ${row.rarita}`, href: row.href, edizione: edition })),
  },
  {
    section: "condizioni", title: "Condizioni",
    rows: async () => bothEditions(conditionRows((await getCorrectedConditions()).list), (row, edition) => ({ nome: row.nome, label: "Condizione", href: row.href, edizione: edition })),
  },
  {
    // Only where the Manual is published (preview); its condition pages are already under Condizioni.
    section: "manuale", title: "Manuale",
    rows: async environment => manualAvailable(environment)
      ? (await getCorrectedManualEntries()).map(entry => ({
        nome: entry.title, label: [MANUAL_CATEGORIES[entry.category], entry.subgroup !== MANUAL_CATEGORIES[entry.category] ? entry.subgroup : ""].filter(Boolean).join(" · "),
        href: `/manuale/${entry.id}`,
      }))
      : [],
  },
];

/** A result of the index: solo, the only edition it exists in (none when in both, or edition-free). */
export interface MergedRow { nome: string; label: string; href: string; href2014?: string; solo?: EquipmentEdition }

/**
 * One result per name and source: a 2024 row and a 2014 row with the same name become one row with
 * both addresses (one when the page is the same); an unpaired 2014 row says "· 2014".
 */
export function mergeEditions(rows: SourceRow[]): MergedRow[] {
  const out: MergedRow[] = [];
  const open2024 = new Map<string, MergedRow[]>();
  for (const row of rows.filter(r => r.edizione !== "2014")) {
    const merged: MergedRow = { nome: row.nome, label: row.label, href: row.href };
    out.push(merged);
    if (row.edizione === "2024") open2024.set(fold(row.nome), [...(open2024.get(fold(row.nome)) ?? []), merged]);
  }
  const pages2024 = new Set(out.map(row => row.href));
  for (const row of rows.filter(r => r.edizione === "2014")) {
    const pair = open2024.get(fold(row.nome))?.shift();
    if (pair) {
      if (row.href !== pair.href) pair.href2014 = row.href;
    } else {
      // A 2014 name on a page shared with a different 2024 name: the page opens on 2014.
      out.push({ nome: row.nome, label: `${row.label} · 2014`, href: pages2024.has(row.href) ? `${row.href}?edizione=2014` : row.href, solo: "2014" });
    }
  }
  // 2024 rows left without a 2014 name.
  for (const left of open2024.values()) for (const row of left) row.solo = "2024";
  return out;
}

/**
 * The compact index of the given sources, sections in the order of their first source.
 * hidden: sections and parts hidden from /admin/sezioni (lib/public-sections.ts), whose pages are left out.
 */
export async function buildSearchIndex(environment = process.env.VERCEL_ENV, sources = SEARCH_SOURCES, hidden: readonly string[] = []): Promise<SearchIndex> {
  const index: SearchIndex = { v: 1, sections: [], rows: [] };
  for (const source of sources) {
    const rows = mergeEditions((await source.rows(environment)).filter(row => !hiddenRow(row, hidden))).filter(row => row.nome && row.href);
    if (!rows.length) continue;
    let position = index.sections.findIndex(section => section.k === source.section);
    if (position < 0) position = index.sections.push({ k: source.section, t: source.title }) - 1;
    for (const row of rows) {
      index.rows.push(row.solo ? [position, row.nome, row.label, row.href, row.href2014 ?? "", row.solo]
        : row.href2014 ? [position, row.nome, row.label, row.href, row.href2014] : [position, row.nome, row.label, row.href]);
    }
  }
  return index;
}
