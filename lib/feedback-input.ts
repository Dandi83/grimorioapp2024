/**
 * Anonymous reports («Segnala»): rules shared by the form, the API and the admin area.
 * No database, no secrets: tests/feedback.cjs loads this file directly.
 */

export const FEEDBACK_TYPES = ["errore", "mancanza", "consiglio"] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export const FEEDBACK_STATES = ["nuova", "letta", "risolta", "archiviata"] as const;
export type FeedbackState = (typeof FEEDBACK_STATES)[number];

export const TYPE_LABELS: Record<FeedbackType, string> = { errore: "Errore", mancanza: "Mancanza", consiglio: "Consiglio" };
export const STATE_LABELS: Record<FeedbackState, string> = { nuova: "Nuova", letta: "Letta", risolta: "Risolta", archiviata: "Archiviata" };

export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 2000;
export const EMAIL_MAX = 254;
export const NOTE_MAX = 2000;
/** A person needs a few seconds to write; a script posting at once is refused. */
export const MIN_FILL_MS = 3000;
/** A form left open longer than this asks for a new token (the page may be a saved copy). */
export const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const BODY_MAX_BYTES = 8192;

export interface FeedbackInput {
  tipo: FeedbackType;
  messaggio: string;
  percorso: string | null;
  edizione: "2014" | "2024" | null;
  email: string | null;
}

export type FeedbackParse =
  | { ok: true; value: FeedbackInput; spam: boolean; token: string }
  | { ok: false; error: string };

/** Removes control characters (keeps line breaks and tabs), unifies line endings, trims. */
export function cleanText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

/** Characters as a person counts them (an emoji is one). */
export function textLength(value: string): number {
  return Array.from(value).length;
}

// Practical check: one @, a dot in the domain, no spaces or angle brackets.
const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

export function validEmail(value: string): boolean {
  return value.length <= EMAIL_MAX && EMAIL.test(value);
}

/**
 * The public page the report is about, as an address of this site. Anything else
 * (another site, the admin area, query strings, odd characters) is dropped.
 */
export function cleanPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const path = value.trim();
  if (path.length > 200 || !/^\/[a-z0-9\-/]*$/.test(path) || path.includes("//")) return null;
  if (/^\/(?:admin|api|segnala)(?:\/|$)/.test(path)) return null;
  return path.length > 1 ? path.replace(/\/$/, "") : path;
}

export function cleanEdition(value: unknown): "2014" | "2024" | null {
  return value === "2014" || value === "2024" ? value : null;
}

export function messageError(message: string): string | null {
  const length = textLength(message);
  if (length < MESSAGE_MIN) return `Scrivi almeno ${MESSAGE_MIN} caratteri.`;
  if (length > MESSAGE_MAX) return `Al massimo ${MESSAGE_MAX} caratteri.`;
  return null;
}

/** Reads the JSON sent by the form. The honeypot field «sito» is invisible to people. */
export function parseFeedback(body: unknown): FeedbackParse {
  if (!body || typeof body !== "object") return { ok: false, error: "Richiesta non valida." };
  const data = body as Record<string, unknown>;
  const tipo = data.tipo;
  if (typeof tipo !== "string" || !(FEEDBACK_TYPES as readonly string[]).includes(tipo)) return { ok: false, error: "Scegli il tipo di segnalazione." };
  if (typeof data.messaggio !== "string") return { ok: false, error: "Scrivi il messaggio." };
  const messaggio = cleanText(data.messaggio);
  const tooShortOrLong = messageError(messaggio);
  if (tooShortOrLong) return { ok: false, error: tooShortOrLong };
  let email: string | null = null;
  if (data.email !== undefined && data.email !== null && data.email !== "") {
    if (typeof data.email !== "string") return { ok: false, error: "Email non valida." };
    const written = cleanText(data.email);
    if (written) {
      if (!validEmail(written)) return { ok: false, error: "Email non valida: controllala o lasciala vuota." };
      email = written;
    }
  }
  const token = typeof data.token === "string" ? data.token : "";
  const spam = typeof data.sito === "string" && data.sito.trim() !== "";
  return {
    ok: true,
    spam,
    token,
    value: { tipo: tipo as FeedbackType, messaggio, percorso: cleanPath(data.percorso), edizione: cleanEdition(data.edizione), email },
  };
}

/** Email subject: only the type label and the checked page address, never the visitor's text. */
export function feedbackSubject(tipo: FeedbackType, percorso: string | null): string {
  return `[Grimorio] ${TYPE_LABELS[tipo]} · ${percorso ?? "nessuna pagina"}`;
}

export function feedbackEmailText(input: FeedbackInput & { id: string; createdAt: Date; adminUrl: string; riguarda: string }): string {
  const when = new Intl.DateTimeFormat("it-IT", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Rome" }).format(input.createdAt);
  return [
    `Nuova segnalazione su Il Grimorio.App`,
    ``,
    `Tipo: ${TYPE_LABELS[input.tipo]}`,
    `Riguarda: ${input.riguarda}`,
    `Data e ora: ${when}`,
    `Email per la risposta: ${input.email ?? "non indicata"}`,
    ``,
    `Messaggio:`,
    input.messaggio,
    ``,
    `Apri nell'amministrazione: ${input.adminUrl}`,
  ].join("\n");
}

/** «Palla di fuoco (2024)», or the address when the page has no name. */
export function aboutLabel(name: string | null, percorso: string | null, edizione: string | null): string {
  if (!percorso) return "nessuna pagina";
  return `${name ?? percorso}${edizione ? ` (${edizione})` : ""}`;
}

/** Names of the pages that are not cards (cards are named by the search index). */
export const PAGE_NAMES: Record<string, string> = {
  "/": "Home",
  "/grimorio": "Incantesimi",
  "/bestiario": "Bestiario",
  "/compendio": "Compendio",
  "/compendio/condizioni": "Condizioni",
  "/preferiti": "Preferiti",
  "/equipaggiamento": "Equipaggiamento",
  "/equipaggiamento/armi": "Armi",
  "/equipaggiamento/armature": "Armature",
  "/equipaggiamento/avventura": "Equipaggiamento d’avventura",
  "/equipaggiamento/strumenti": "Strumenti",
  "/oggetti-magici": "Oggetti magici",
  "/avanzamento": "Avanzamento",
  "/manuale": "Manuale",
  "/fonti": "Fonti e licenze",
  "/info": "Info e note legali",
  "/privacy": "Privacy",
};

const romeDay = (date: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(date);

/** «oggi 15:12», «ieri 21:05», «19 ott» (Italian time). */
export function formatWhen(date: Date, now = new Date()): string {
  const day = romeDay(date);
  const time = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" }).format(date);
  if (day === romeDay(now)) return `oggi ${time}`;
  if (day === romeDay(new Date(now.getTime() - 24 * 60 * 60 * 1000))) return `ieri ${time}`;
  const sameYear = day.slice(0, 4) === romeDay(now).slice(0, 4);
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }), timeZone: "Europe/Rome" }).format(date);
}
