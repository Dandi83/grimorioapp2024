import type { DiffPart } from "./word-diff";

/**
 * One row of the lists of the reserved area, the same for every content (spells, creatures, magic items,
 * conditions, classes, equipment, manual) in both editions. Pure: built on the server (lib/admin-lists.ts),
 * shown by components/admin-list/admin-list.tsx.
 */
export type AdminListKind = "incantesimo" | "mostro" | "contenuto";

export interface AdminRow {
  id: string;
  name: string;
  /** School, type, category: the small line under the name. */
  sub: string;
  /** The first column on a computer: level, challenge rating, nothing. */
  lead?: string;
  group: { key: string; label: string; order: number };
  /** SRD: transcribed from the SRD and unchanged; NO SRD: original summaries, cards added here, homebrew, SRD cards modified. */
  source: "srd" | "nosrd";
  /** The pill of a NO SRD card. */
  pill?: "Sintesi" | "Aggiunta da te" | "Homebrew";
  /** «SRD modificata»: the fields that no longer match the SRD, for «Ripristina testo SRD». */
  modified?: { label: string; diff: DiffPart[] }[];
  /** «Nome da rivedere»: the names of lib/data/nomi-da-rivedere.json found in the card. */
  reviewNames?: string[];
  /** Hidden from the site with the switch; null where a card cannot be hidden on its own. */
  hidden: boolean | null;
  editHref: string;
  publicHref: string;
  /** Only for the cards added here: which delete action. */
  deletable?: "spell" | "monster" | "homebrew";
}

export interface AdminListData {
  kind: AdminListKind;
  /** The content key of the list: incantesimi, mostri or a section of lib/content-sections.ts. */
  section: string;
  title: string;
  edition: "2014" | "2024";
  rows: AdminRow[];
}

export type VisibilityFilter = "tutte" | "visibili" | "nascoste";
export type SourceFilter = "tutte" | "srd" | "nosrd";
export interface ListFilters { visibility: VisibilityFilter; source: SourceFilter; modified: boolean; reviewNames: boolean }
export const NO_FILTERS: ListFilters = { visibility: "tutte", source: "tutte", modified: false, reviewNames: false };

/** How many filters are on (the number on the «Filtri» button). */
export function activeFilterCount(filters: ListFilters): number {
  return (filters.visibility !== "tutte" ? 1 : 0) + (filters.source !== "tutte" ? 1 : 0) + (filters.modified ? 1 : 0) + (filters.reviewNames ? 1 : 0);
}

/** The rows that match the filters. «Da controllare» on both shows the cards with either warning. */
export function filterRows(rows: readonly AdminRow[], filters: ListFilters, isHidden: (row: AdminRow) => boolean): AdminRow[] {
  return rows.filter(row => {
    if (filters.visibility !== "tutte" && (row.hidden === null || isHidden(row) !== (filters.visibility === "nascoste"))) return false;
    if (filters.source !== "tutte" && row.source !== filters.source) return false;
    if (filters.modified || filters.reviewNames) {
      const wanted = (filters.modified && !!row.modified?.length) || (filters.reviewNames && !!row.reviewNames?.length);
      if (!wanted) return false;
    }
    return true;
  });
}

/** The counts of the filter panel, for the rows already searched. */
export function filterCounts(rows: readonly AdminRow[], isHidden: (row: AdminRow) => boolean) {
  return {
    all: rows.length,
    hidden: rows.filter(row => row.hidden !== null && isHidden(row)).length,
    srd: rows.filter(row => row.source === "srd").length,
    nosrd: rows.filter(row => row.source === "nosrd").length,
    modified: rows.filter(row => !!row.modified?.length).length,
    reviewNames: rows.filter(row => !!row.reviewNames?.length).length,
  };
}

/** The rows in groups, in the order of the groups, each group in the order the rows came. */
export function groupRows(rows: readonly AdminRow[]): { key: string; label: string; rows: AdminRow[] }[] {
  const groups = new Map<string, { key: string; label: string; order: number; rows: AdminRow[] }>();
  for (const row of rows) {
    const group = groups.get(row.group.key) ?? { ...row.group, rows: [] };
    group.rows.push(row);
    groups.set(row.group.key, group);
  }
  return [...groups.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, "it")).map(({ key, label, rows }) => ({ key, label, rows }));
}

/** Spells: «Trucchetti», «1° livello» … (unknown level last). */
export function spellGroup(level: number): AdminRow["group"] {
  if (level === 0) return { key: "0", label: "Trucchetti", order: 0 };
  if (level > 0) return { key: String(level), label: `${level}° livello`, order: level };
  return { key: "?", label: "Livello da indicare", order: 99 };
}

/** Creatures: one group per challenge rating, «GS 1/4», in numeric order. */
export function challengeGroup(gs: string, value: number): AdminRow["group"] {
  return gs ? { key: `gs-${gs}`, label: `GS ${gs}`, order: Number.isFinite(value) ? value : 999 } : { key: "gs-?", label: "GS da indicare", order: 999 };
}

/** Any other content: its natural group when the list has a few, otherwise the first letter. */
export function naturalGroups(items: readonly { nome: string; etichetta: string }[]): (item: { nome: string; etichetta: string }) => AdminRow["group"] {
  const labels = [...new Set(items.map(item => item.etichetta).filter(Boolean))];
  if (labels.length >= 2 && labels.length <= 12) {
    const order = new Map(labels.sort((a, b) => a.localeCompare(b, "it")).map((label, index) => [label, index]));
    return item => ({ key: `g-${item.etichetta}`, label: item.etichetta || "Altro", order: order.get(item.etichetta) ?? 99 });
  }
  return item => {
    const letter = item.nome.normalize("NFD").replace(/[̀-ͯ]/g, "").charAt(0).toUpperCase() || "#";
    return { key: `l-${letter}`, label: letter, order: letter.charCodeAt(0) };
  };
}
