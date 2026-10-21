/**
 * How manual corrections are laid over the original values. Pure: no database, so the
 * pages, the admin area and tests/content-overrides.cjs use the same rules.
 */

export interface ContentOverride {
  id: string;
  sezione: string;
  scheda_id: string;
  edizione: string;
  campo: string;
  valore_originale: string;
  valore_nuovo: string;
  motivo: string;
  creata_il: Date | string;
  creata_da: string;
  annullata_il: Date | string | null;
}

export const overrideKey = (sezione: string, id: string, edizione: string, campo: string) => `${sezione}|${id}|${edizione}|${campo}`;

/** The correction in force for every field: the newest one not undone. */
export function activeOverrideMap(rows: ContentOverride[]): Map<string, ContentOverride> {
  const map = new Map<string, ContentOverride>();
  for (const row of rows) {
    if (row.annullata_il) continue;
    const key = overrideKey(row.sezione, row.scheda_id, row.edizione, row.campo);
    const current = map.get(key);
    if (!current || new Date(row.creata_il).getTime() >= new Date(current.creata_il).getTime()) map.set(key, row);
  }
  return map;
}

/**
 * The record with the corrections of its card applied. Only the editable fields the record
 * already has are changed (a correction of a field that no longer exists is ignored, never added).
 */
export function applyOverrides<T extends object>(record: T, sezione: string, id: string, edizione: string, active: Map<string, ContentOverride>, editable: readonly string[]): { record: T; applied: ContentOverride[] } {
  const applied: ContentOverride[] = [];
  const out = { ...record } as Record<string, unknown>;
  for (const field of editable) {
    if (!(field in out)) continue;
    const row = active.get(overrideKey(sezione, id, edizione, field));
    if (!row) continue;
    out[field] = row.valore_nuovo;
    applied.push(row);
  }
  return { record: out as T, applied };
}

export type OverrideHealth = "ok" | "orphan" | "original-changed";

/**
 * Orphan: the card, edition or field no longer exists in the project files (the correction is kept
 * but has no effect). Original changed: the manual data were updated after the correction was made.
 */
export function overrideHealth(row: ContentOverride, original: Record<string, string> | undefined): OverrideHealth {
  if (!original || !(row.campo in original)) return "orphan";
  return original[row.campo] === row.valore_originale ? "ok" : "original-changed";
}
