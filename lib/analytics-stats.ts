// Pure helpers of the statistics (no database, no browser globals): the categories computed in the browser before
// sending, the cleaning of the searched words, the periods of /admin/statistiche and their comparisons.

export const ORIGINS = ["instagram", "diretto", "google", "condiviso", "altro"] as const;
export type Origin = (typeof ORIGINS)[number];
export const DEVICES = ["iphone", "android", "computer", "altro"] as const;
export type Device = (typeof DEVICES)[number];

/**
 * Where a visit comes from, from the referrer and the utm parameters of the first page: only the category is
 * sent, never the address. own: the host of the site (a referrer from the site itself is a direct visit).
 */
export function originOf(referrer: string, search: string, own: string): Origin {
  const params = new URLSearchParams(search);
  const utm = `${params.get("utm_source") ?? ""} ${params.get("utm_medium") ?? ""}`.toLowerCase();
  if (/instagram|\big\b/.test(utm)) return "instagram";
  if (params.get("ref") === "share" || /share|condivis/.test(utm)) return "condiviso";
  if (/google/.test(utm)) return "google";
  let host = "";
  try { host = referrer ? new URL(referrer).hostname.toLowerCase() : ""; } catch { host = ""; }
  if (!host || host === own.toLowerCase()) return utm.trim() ? "altro" : "diretto";
  if (/(^|\.)instagram\.com$/.test(host)) return "instagram";
  if (/(^|\.)google\.[a-z.]+$/.test(host)) return "google";
  // Links passed on in messages and social networks.
  if (/(^|\.)(whatsapp\.com|wa\.me|t\.me|telegram\.org|facebook\.com|fb\.me|messenger\.com|threads\.net|reddit\.com|discord\.com|discord\.gg|x\.com|t\.co|twitter\.com)$/.test(host)) return "condiviso";
  return "altro";
}

/** The kind of device, from the user agent read in the browser: only the category is sent, never the user agent. */
export function deviceOf(userAgent: string, touchPoints = 0): Device {
  if (/iPhone|iPod/.test(userAgent)) return "iphone";
  if (/Android/.test(userAgent)) return "android";
  // iPad, and iPadOS that reports a Mac: a tablet, not a computer.
  if (/iPad/.test(userAgent) || (/Macintosh/.test(userAgent) && touchPoints > 1)) return "altro";
  if (/Windows NT|Macintosh|X11|Linux|CrOS/.test(userAgent)) return "computer";
  return "altro";
}

/** A searched word as stored: lower case, letters, numbers, spaces and apostrophes only, single spaces, 40 characters. */
export function cleanSearchQuery(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw.toLowerCase().replace(/[’‘`´]/g, "'").replace(/[^\p{L}\p{N}' ]+/gu, " ").replace(/\s+/g, " ").trim().slice(0, 40).trim();
  return text.length >= 2 ? text : null;
}

export const PERIODS = { "7": "Ultimi 7 giorni", "30": "Ultimi 30 giorni", "90": "Ultimi 90 giorni", instagram: "Da quando c’è Instagram" } as const;
export type Period = keyof typeof PERIODS;
/** The day the Instagram profile opened: the start of «Da quando c’è Instagram». */
export const INSTAGRAM_START = "2026-10-26";

const shiftDay = (day: string, days: number) => {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000) + 1;

export function periodOf(value: unknown): Period {
  return value === "7" || value === "90" || value === "instagram" ? value : "30";
}

/** The days of the period (today included) and of the previous period of the same length, just before it. */
export function periodRange(period: Period, today: string) {
  const from = period === "instagram" ? (INSTAGRAM_START <= today ? INSTAGRAM_START : today) : shiftDay(today, -(Number(period) - 1));
  const length = daysBetween(from, today);
  return { from, to: today, length, prevFrom: shiftDay(from, -length), prevTo: shiftDay(from, -1) };
}

/** Every day of the range, with 0 where nothing was counted. */
export function fillDays(from: string, to: string, counts: { day: string; visitors: number }[]) {
  const byDay = new Map(counts.map(row => [row.day, row.visitors]));
  const days: { day: string; visitors: number }[] = [];
  for (let day = from; day <= to; day = shiftDay(day, 1)) days.push({ day, visitors: byDay.get(day) ?? 0 });
  return days;
}

/** Change against the previous period, rounded; null when there was nothing to compare with. */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Share of a part, rounded (0 when the whole is 0). */
export function share(part: number, whole: number): number {
  return whole ? Math.round((part / whole) * 100) : 0;
}

export const signed = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value)}%`;

/** «Questa settimana …», «Negli ultimi 30 giorni …»: the first sentence of «In breve». */
export function summarySentence(period: Period, people: number, change: number | null, length: number): string {
  const who = `${people.toLocaleString("it-IT")} ${people === 1 ? "persona ha" : "persone hanno"} usato il Grimorio`;
  const [now, before] = period === "7" ? ["Questa settimana", "alla settimana prima"]
    : period === "instagram" ? ["Da quando c’è Instagram", `ai ${length} giorni prima`]
    : [`Negli ultimi ${period} giorni`, `ai ${period} giorni prima`];
  return change === null ? `${now} ${who}.` : `${now} ${who}: ${signed(change)} rispetto ${before}.`;
}

const DAY_NAMES = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
/** «lunedì 26 ottobre» */
export const dayLabel = (day: string) => DAY_NAMES.format(new Date(`${day}T12:00:00Z`));
const SHORT = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", timeZone: "UTC" });
/** «26 ott» */
export const shortDay = (day: string) => SHORT.format(new Date(`${day}T12:00:00Z`));

/** The day with the most people (the first of them when equal); null without any. */
export function bestDay(days: { day: string; visitors: number }[]) {
  return days.reduce<{ day: string; visitors: number } | null>((best, row) => row.visitors > (best?.visitors ?? 0) ? row : best, null);
}

/** Areas of the site for «Cosa usano di più?», from the path of a page view. */
export function areaOf(path: string): "incantesimi" | "bestiario" | "compendio" | null {
  if (/^\/(?:grimorio|spell\/)/.test(path)) return "incantesimi";
  if (/^\/(?:bestiario|mostro\/)/.test(path)) return "bestiario";
  if (/^\/(?:compendio|regole\/|oggetti-magici|equipaggiamento|manuale\/)/.test(path)) return "compendio";
  return null;
}

export type CardOpens = { kind: string; id: string; title: string; opens: number };

/**
 * «Le schede più aperte»: the readings of one card stored under several ids (the address of a spell renamed in
 * PROMPT 8, a duplicate row merged into the kept one) add up on the id of the current card; then the first `limit`,
 * by readings and name. currentId: the id a stored id stands for today (itself when nothing changed).
 */
export function mergeCardOpens(rows: CardOpens[], currentId: (kind: string, id: string) => string, limit = 10): CardOpens[] {
  const merged = new Map<string, CardOpens>();
  for (const row of rows) {
    const id = currentId(row.kind, row.id), key = `${row.kind}:${id}`;
    const seen = merged.get(key);
    // The title of the current id wins over the one stored with an old address.
    if (seen) merged.set(key, { ...seen, opens: seen.opens + row.opens, title: row.id === id ? row.title : seen.title });
    else merged.set(key, { ...row, id });
  }
  return [...merged.values()].sort((a, b) => b.opens - a.opens || a.title.localeCompare(b.title, "it")).slice(0, limit);
}

export type AppSplit = { android: number; iphone: number; altro: number; androidLabel: "Android" | "Android e computer" };

/**
 * «Usano l’app» (PROMPT 17): the same people as the big number, by system. The computers count with Android (both
 * confirm the installation the same way), named in the label when there are some; tablets and unknown systems
 * are «altro». The three parts always add up to the people of the tile.
 */
export function appSplit(devices: Partial<Record<Device, number>>, people: number): AppSplit {
  const computer = devices.computer ?? 0, android = (devices.android ?? 0) + computer, iphone = devices.iphone ?? 0;
  return { android, iphone, altro: Math.max(0, people - android - iphone), androidLabel: computer > 0 ? "Android e computer" : "Android" };
}
