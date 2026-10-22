import { sanitizeEditorHtml } from "@/lib/monster-editor-content";

/** Columns of the spell editor, in the order of the form. */
export const SPELL_EDITOR_FIELDS = [
  "nome_italiano",
  "livello",
  "tempo_di_lancio",
  "gittata",
  "componenti",
  "durata",
  "descrizione",
] as const;
export type SpellEditorField = (typeof SPELL_EDITOR_FIELDS)[number];

const lines = (value: string) => value.replace(/\r\n?/g, "\n").trim();

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", "#39": "'", nbsp: " " };

/**
 * The description as the visual editor gives it back when nobody changed it: the browser
 * re-serializes the text (entities, line breaks, cleaned tags), so the bytes can differ.
 */
function descriptionShape(value: string): string {
  return lines(sanitizeEditorHtml(lines(value)).replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_whole, name: string) => ENTITIES[name]));
}

function sameValue(field: SpellEditorField, stored: string, sent: string): boolean {
  if (stored === sent || lines(stored) === lines(sent)) return true;
  return field === "descrizione" && descriptionShape(stored) === descriptionShape(sent);
}

/**
 * Only the fields the person really changed. A field missing from the form (an old open
 * editor) or equal to the stored text is left out, so the database keeps its exact bytes.
 */
export function changedSpellFields(stored: Record<string, unknown>, sent: Partial<Record<SpellEditorField, string>>) {
  const changes: Partial<Record<SpellEditorField, string>> = {};
  for (const field of SPELL_EDITOR_FIELDS) {
    const value = sent[field];
    if (value === undefined) continue;
    const before = typeof stored[field] === "string" ? (stored[field] as string) : "";
    if (!sameValue(field, before, value)) changes[field] = value.replace(/\r\n?/g, "\n");
  }
  return changes;
}
