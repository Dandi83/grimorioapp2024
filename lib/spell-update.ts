import { changedEditorFields } from "@/lib/editor-changes";

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

/** Only the fields the person really changed; the description comes from the visual editor. */
export function changedSpellFields(stored: Record<string, unknown>, sent: Partial<Record<SpellEditorField, string>>) {
  return changedEditorFields(SPELL_EDITOR_FIELDS, ["descrizione"], stored, sent);
}
