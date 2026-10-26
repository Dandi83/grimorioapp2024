/**
 * Checks of a manual correction, by kind of field. Pure: shared by the admin form, the
 * Server Action and tests/content-overrides.cjs. Values are plain text, never HTML.
 */

export type FieldKind = "text" | "longtext" | "list" | "dice" | "currency" | "weight" | "number";

export interface FieldSpec {
  /** Key of the field in the original record. */
  name: string;
  label: string;
  kind: FieldKind;
  /** Maximum length in characters. */
  max: number;
  /** May the field be empty (as some printed cells are)? */
  optional?: boolean;
  /** Short hint under the field. */
  hint?: string;
}

/** Trims, joins spaces and removes control and direction characters; multi-line text keeps its line breaks. */
export function normalizeValue(kind: FieldKind, value: string): string {
  const clean = value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, "");
  if (kind === "longtext") return clean.split("\n").map(line => line.replace(/[ \t]+/g, " ").trimEnd()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return clean.replace(/\s+/g, " ").trim();
}

const PATTERNS: Partial<Record<FieldKind, { test: RegExp; message: string }>> = {
  // "1d8", "2d6", "1d4 + 1", "1" (a fixed damage) or "—".
  dice: { test: /^(?:—|\d{1,3}|\d{1,2}d\d{1,3}(?: ?[+−-] ?\d{1,3})?)$/, message: "Usa un dado come 1d8, 2d6 o 1d4 + 1, un numero o «—»." },
  // "5 mo", "1.500 mo", "1 ma", "2 mr", "0,5 mo" or "—".
  currency: { test: /^(?:—|(?:\d{1,3}(?:\.\d{3})+|\d{1,6})(?:,\d{1,2})? (?:mr|ma|me|mo|mp))$/, message: "Usa una cifra con la moneta: 5 mo, 1.500 mo, 2 ma, 1 mr (oppure «—»)." },
  // "3 kg", "0,5 kg", "250 g" or "—".
  weight: { test: /^(?:—|\d{1,4}(?:,\d{1,3})? (?:kg|g))$/, message: "Usa un peso come 3 kg, 0,5 kg o 250 g (oppure «—»)." },
  number: { test: /^-?\d{1,6}$/, message: "Scrivi un numero intero." },
};

/** Null when the value is acceptable for the field, else the message to show. */
export function fieldError(field: FieldSpec, value: string): string | null {
  if (!value) return field.optional ? null : `${field.label}: il campo non può essere vuoto.`;
  if (Array.from(value).length > field.max) return `${field.label}: al massimo ${field.max} caratteri.`;
  if (/[<>]/.test(value)) return `${field.label}: i simboli < e > non sono ammessi (il testo è mostrato così com'è, senza HTML).`;
  if (field.kind !== "longtext" && value.includes("\n")) return `${field.label}: una sola riga.`;
  const pattern = PATTERNS[field.kind];
  if (pattern && !pattern.test.test(value)) return `${field.label}: ${pattern.message}`;
  if (field.kind === "list") {
    let depth = 0;
    for (const char of value) {
      if (char === "(") depth++;
      if (char === ")" && --depth < 0) break;
    }
    if (depth !== 0) return `${field.label}: parentesi non bilanciate.`;
  }
  return null;
}

const REASON_MIN = 5;
export const REASON_MAX = 500;

export function reasonError(reason: string): string | null {
  const length = Array.from(reason).length;
  if (length < REASON_MIN) return `Il motivo è obbligatorio (almeno ${REASON_MIN} caratteri).`;
  if (length > REASON_MAX) return `Il motivo può avere al massimo ${REASON_MAX} caratteri.`;
  return null;
}
