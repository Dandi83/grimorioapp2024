import { sanitizeEditorHtml } from "@/lib/monster-editor-content";

const lines = (value: string) => value.replace(/\r\n?/g, "\n").trim();

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", "#39": "'", nbsp: " " };

/**
 * A text from the visual editor as it comes back when nobody changed it: the browser
 * re-serializes it (entities, line breaks, cleaned tags), so the bytes can differ.
 */
function htmlShape(value: string): string {
  return lines(sanitizeEditorHtml(lines(value)).replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_whole, name: string) => ENTITIES[name]));
}

function sameValue(html: boolean, stored: unknown, sent: string | number): boolean {
  if (typeof sent === "number") return stored === sent || String(stored ?? "") === String(sent);
  const before = typeof stored === "string" ? stored : stored == null ? "" : String(stored);
  if (before === sent || lines(before) === lines(sent)) return true;
  return html && htmlShape(before) === htmlShape(sent);
}

/**
 * Only the fields the person really changed. A field missing from the form (an old open
 * editor) or equal to the stored value is left out, so the database keeps its exact bytes.
 */
export function changedEditorFields<F extends string, V extends string | number>(
  fields: readonly F[],
  htmlFields: readonly F[],
  stored: Partial<Record<string, unknown>>,
  sent: Partial<Record<F, V>>,
): Partial<Record<F, V>> {
  const changes: Partial<Record<F, V>> = {};
  for (const field of fields) {
    const value = sent[field];
    if (value === undefined) continue;
    if (!sameValue(htmlFields.includes(field), stored[field], value)) {
      changes[field] = (typeof value === "string" ? value.replace(/\r\n?/g, "\n") : value) as V;
    }
  }
  return changes;
}
