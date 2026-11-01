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
  // The link of the Instagram bio (PROMPT 31): an arrival from Instagram, whatever the in-app browser says.
  if (params.get("da") === BIO_VALUE) return "instagram";
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

export const PERIODS = { "24h": "Ultime 24 ore", "7": "Ultimi 7 giorni", "30": "Ultimi 30 giorni", "90": "Ultimi 90 giorni", instagram: "Da quando c’è Instagram" } as const;
export type Period = keyof typeof PERIODS;
/** The order of the menu: «Ultime 24 ore» first (PROMPT 30); an object puts the keys that look like numbers first. */
export const PERIOD_ORDER: readonly Period[] = ["24h", "7", "30", "90", "instagram"];
export type DayPeriod = Exclude<Period, "24h">;
/** The day the Instagram profile opened: the start of «Da quando c’è Instagram». */
export const INSTAGRAM_START = "2026-10-26";

const shiftDay = (day: string, days: number) => {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000) + 1;

export function periodOf(value: unknown): Period {
  return value === "24h" || value === "7" || value === "90" || value === "instagram" ? value : "30";
}

/** The days of the period (today included) and of the previous period of the same length, just before it. */
export function periodRange(period: DayPeriod, today: string) {
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
  const [now, before] = period === "24h" ? ["Nelle ultime 24 ore", "alle 24 ore prima"] : period === "7" ? ["Questa settimana", "alla settimana prima"]
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

/*
 * «Ultime 24 ore» (PROMPT 30): a moving window of 24 hours up to now, never days of the calendar, and the 24 hours just
 * before for the comparison. The 24 bars are slices of exactly 60 minutes counted from the start of the window
 * (at 14:20 the bars are 14:20–15:20 … 13:20–14:20): every visit of the window is in one bar, and a night with a
 * change of time keeps its real hours. Labels in the Rome time zone.
 */
const HOUR = 3600000;
export type HourWindow = { start: string; end: string; prevStart: string; prevEnd: string; bars: string[] };
/** The window of 24 hours ending now (to the minute); bars: the start of each bar, as ISO strings in UTC. */
export function hourWindow(now: Date): HourWindow {
  const end = Math.floor(now.getTime() / 60000) * 60000, start = end - 24 * HOUR;
  const iso = (time: number) => new Date(time).toISOString();
  return { start: iso(start), end: iso(end), prevStart: iso(start - 24 * HOUR), prevEnd: iso(start), bars: Array.from({ length: 24 }, (_, index) => iso(start + index * HOUR)) };
}

const ROME_PARTS = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZoneName: "short" });
const ROME_DAY = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" });
const romeClock = (time: number) => {
  const parts = Object.fromEntries(ROME_PARTS.formatToParts(new Date(time)).map(part => [part.type, part.value]));
  return { clock: `${parts.hour}:${parts.minute}`, summer: parts.timeZoneName === "CEST" || parts.timeZoneName === "GMT+2" };
};

/** «15:00–16:00» in Rome; on the night the clock goes back, the two bars with the same clock get «ora legale» / «ora solare». */
export function hourLabels(bars: string[]): string[] {
  const starts = bars.map(bar => romeClock(Date.parse(bar)));
  return bars.map((bar, index) => {
    const start = starts[index];
    if (starts.filter(other => other.clock === start.clock).length === 1) return `${start.clock}–${romeClock(Date.parse(bar) + HOUR).clock}`;
    const next = `${String((Number(start.clock.slice(0, 2)) + 1) % 24).padStart(2, "0")}${start.clock.slice(2)}`;
    return `${start.clock}–${next} (${start.summer ? "ora legale" : "ora solare"})`;
  });
}

export type HourBar = { hour: string; label: string; visitors: number };
/** Every bar of the window with its people (0 where nothing was counted); counts keyed by the index of the bar (0–23). */
export function fillHours(window: HourWindow, counts: { day: string | number; visitors: number }[]): HourBar[] {
  const byBar = new Map(counts.map(row => [Number(row.day), row.visitors]));
  const labels = hourLabels(window.bars);
  return window.bars.map((hour, index) => ({ hour, label: labels[index], visitors: byBar.get(index) ?? 0 }));
}

/** The hour with the most people (the first of them when equal); null without any. */
export function bestHour(bars: HourBar[]): HourBar | null {
  return bars.reduce<HourBar | null>((best, row) => (row.visitors > (best?.visitors ?? 0) ? row : best), null);
}

/** The UTC instant of a wall time of Rome (a day and a whole hour): the first one when the clock goes back. */
export function romeInstant(day: string, hour: number): number {
  const wall = Date.parse(`${day}T${String(hour).padStart(2, "0")}:00:00Z`), clock = `${String(hour).padStart(2, "0")}:00`;
  // Rome is two (summer) or one hour ahead of UTC: the earlier moment whose Rome clock and day are those.
  for (const offset of [2, 1]) {
    const time = wall - offset * HOUR;
    if (romeClock(time).clock === clock && ROME_DAY.format(new Date(time)) === day) return time;
  }
  // An hour the clock skips (02:00 on the night of the summer time): the moment it jumps to.
  return wall - HOUR;
}

/**
 * Where a marked event goes on the chart of the hours: its hour when the administrator gave one; else the moment it
 * was saved, when that was on its day; else the start of its day.
 */
export function markerTime(marker: { giorno: string; ora?: number | null; creato_il?: string | Date | null }): number {
  if (typeof marker.ora === "number") return romeInstant(marker.giorno, marker.ora);
  const saved = marker.creato_il ? new Date(marker.creato_il).getTime() : NaN;
  if (Number.isFinite(saved) && ROME_DAY.format(new Date(saved)) === marker.giorno) return saved;
  return romeInstant(marker.giorno, 0);
}

/** The bar a moment falls in (its index), or -1 outside the window. */
export function barOf(window: HourWindow, time: number): number {
  const start = Date.parse(window.start);
  return time < start || time >= Date.parse(window.end) ? -1 : Math.floor((time - start) / HOUR);
}

/*
 * Insight (PROMPT 31). The link of the Instagram bio: one fixed address, ilgrimorio.app/?da=bio, read on the first
 * page and taken off the address (as ?da=amico); its arrival travels in the page_view already sent.
 */
export const BIO_VALUE = "bio";
/** PROMPT 34: the short link to copy in the bio (a 307 to /?da=bio, next.config.mjs); the long one still works. */
export const BIO_LINK = "ilgrimorio.app/ig";
export const BIO_LONG_LINK = "ilgrimorio.app/?da=bio";
/** Where a search was typed: the list of the spells, the Bestiario, the search of the Home. */
export const SEARCH_AREAS = ["incantesimi", "bestiario", "globale", "armi", "armature"] as const;
export type SearchArea = (typeof SEARCH_AREAS)[number];
/** The groups of the filters of the lists (only the group, never a value): spells, then the Bestiario. */
export const FILTER_GROUPS = ["livello", "scuola", "classe", "tempo", "concentrazione", "rituale", "categoria", "gs", "tipo", "taglia", "habitat"] as const;
export type FilterGroup = (typeof FILTER_GROUPS)[number];

/** «Il percorso»: the steps, in order, and the largest drop between two following steps. */
export const FUNNEL_STEPS = [
  { key: "arrivano", label: "Arrivano" }, { key: "scheda", label: "Aprono una scheda" }, { key: "cercano", label: "Cercano o filtrano" },
  { key: "preferito", label: "Salvano un preferito" }, { key: "installano", label: "Installano l’app" }, { key: "tornano", label: "Tornano entro 7 giorni" },
] as const;
export type FunnelKey = (typeof FUNNEL_STEPS)[number]["key"];
export type FunnelRow = { key: FunnelKey; label: string; people: number; percent: number };
export function funnel(counts: Record<FunnelKey, number>): { rows: FunnelRow[]; drop: { from: string; to: string; percent: number } | null } {
  const arrived = counts.arrivano;
  const rows = FUNNEL_STEPS.map(step => ({ key: step.key, label: step.label, people: counts[step.key], percent: share(counts[step.key], arrived) }));
  let drop: { from: string; to: string; percent: number } | null = null;
  for (let index = 1; index < rows.length; index++) {
    const before = rows[index - 1], after = rows[index];
    if (!before.people || after.people >= before.people) continue;
    const percent = Math.round(((before.people - after.people) / before.people) * 100);
    if (!drop || percent > drop.percent) drop = { from: before.label, to: after.label, percent };
  }
  return { rows, drop };
}

/** The Monday (YYYY-MM-DD) of the week of a day. */
export function weekOf(day: string): string {
  const date = new Date(`${day}T12:00:00Z`);
  return shiftDay(day, -((date.getUTCDay() + 6) % 7));
}
export const COHORT_WEEKS = 8;
export const COHORT_AFTER = [1, 2, 4] as const;
export type CohortRow = { week: string; group: "instagram" | "altre"; people: number; after: (number | null)[] };
/**
 * «Chi resta davvero»: the weeks of arrival (Monday to Sunday, Rome), the last 8, for Instagram and the other
 * sources; for each, the share of the people back 1, 2 and 4 weeks later; null («—») while that week has not ended.
 * arrivals: one row per person, the Monday of the arrival week; returns: the Mondays of the weeks they came back.
 */
export function cohorts(today: string, people: { week: string; instagram: boolean; back: string[] }[]): CohortRow[] {
  const thisWeek = weekOf(today);
  const weeks = Array.from({ length: COHORT_WEEKS }, (_, index) => shiftDay(thisWeek, -7 * (COHORT_WEEKS - 1 - index)));
  return weeks.flatMap(week => (["instagram", "altre"] as const).map(group => {
    const members = people.filter(person => person.week === week && person.instagram === (group === "instagram"));
    const after = COHORT_AFTER.map(gap => {
      const target = shiftDay(week, 7 * gap);
      // The week «gap» after has ended only when its Sunday is before today.
      if (shiftDay(target, 6) >= today) return null;
      return members.length ? share(members.filter(person => person.back.includes(target)).length, members.length) : null;
    });
    return { week, group, people: members.length, after };
  }));
}
/** The green of a cell: darker for higher values (0–100). */
export function cohortShade(percent: number | null): string {
  if (percent === null) return "transparent";
  const steps = ["#EEF5F0", "#D3E7DA", "#A9D0B7", "#6FAE88", "#1F6B45"];
  return steps[Math.min(steps.length - 1, Math.floor(percent / 20))];
}

/** Why a search found nothing, when it can be told (PROMPT 31). */
export type SearchReason =
  | { kind: "non-srd" } | { kind: "in-arrivo" } | { kind: "manca"; edition: "2014" | "2024" } | { kind: "errore"; suggestion: string };
export function reasonLabel(reason: SearchReason | null): string {
  if (!reason) return "";
  return reason.kind === "non-srd" ? "mostro non SRD" : reason.kind === "in-arrivo" ? "sezione in arrivo"
    : reason.kind === "manca" ? `manca in ${reason.edition}` : `errore? → ${reason.suggestion}`;
}

/*
 * Insight 2/2 (PROMPT 32). The uses that ride in the events already sent (page view, search, installation): the
 * name only, from this fixed list; the server keeps one row per use.
 */
// The invite «Installala» (PROMPT 43): shown, tapped (its button, «Come si fa» or «Copia il link»), closed; the
// installation itself is the event app_installed (the browser's appinstalled), already counted.
export const USE_SIGNALS = ["edition_change", "proposal_start", "proposal_sent", "install_prompt_shown", "install_prompt_accepted",
  "install_prompt_tapped", "install_prompt_closed"] as const;
export type UseSignal = (typeof USE_SIGNALS)[number];

/** «Giorni e ore»: 7 days (Monday first) × 8 bands of 3 hours, Rome time. */
export const WEEK_DAYS = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"] as const;
export const HEAT_COLORS = ["#F6EFDF", "#EBCFB0", "#D49A84", "#A8505A", "#7A1F2B"] as const;
export const bandLabel = (band: number) => `${band * 3}–${band * 3 + 3}`;
/** The visits of each cell (day 0–6 from Monday, band 0–7), its colour and the two cells with the most visits. */
export function heatmap(rows: { day: number; band: number; visits: number }[]) {
  const grid = Array.from({ length: 7 }, () => Array.from({ length: 8 }, () => 0));
  for (const row of rows) if (row.day >= 0 && row.day < 7 && row.band >= 0 && row.band < 8) grid[row.day][row.band] += row.visits;
  const max = Math.max(0, ...grid.flat());
  const color = (visits: number) => HEAT_COLORS[visits && max ? Math.min(4, Math.ceil((visits / max) * 4)) : 0];
  const peaks = grid.flatMap((bands, day) => bands.map((visits, band) => ({ day, band, visits })))
    .filter(cell => cell.visits > 0).sort((a, b) => b.visits - a.visits || a.day - b.day || a.band - b.band).slice(0, 2);
  return { grid, max, color, peak: peaks.length ? `Picco: ${peaks.map(cell => `${WEEK_DAYS[cell.day]} ${bandLabel(cell.band)}`).join(" · ")}` : "" };
}

/** The median of some numbers (the mean of the two in the middle when even); null without any. */
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
export const SLOW_LCP_MS = 2500;
export const SLOW_MIN_MEASURES = 3;
/** «Lenta»: the pages whose median LCP on a phone is over 2.5 s, with at least 3 measures; the slowest first. */
export function slowPages(rows: { path: string; values: number[] }[]) {
  return rows.filter(row => row.values.length >= SLOW_MIN_MEASURES)
    .map(row => ({ path: row.path, median: median(row.values)!, measures: row.values.length }))
    .filter(row => row.median > SLOW_LCP_MS).sort((a, b) => b.median - a.median || a.path.localeCompare(b.path));
}
/** «1,2 s» */
export const seconds = (ms: number) => `${(Math.round(ms / 100) / 10).toLocaleString("it-IT")} s`;

/** A two-step funnel: how many started, how many finished, the share. */
export const twoSteps = (from: number, to: number) => ({ from, to, percent: share(to, from) });

/** «Non trovata»: the path asked, without parameters; only plain characters, never a page of the reserved area. */
export function cleanNotFoundPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const path = raw.split(/[?#]/)[0];
  if (!/^\/[A-Za-z0-9/_.~%-]{0,199}$/.test(path) || /^\/(?:admin|api|_next)(?:\/|$)/.test(path)) return null;
  return path;
}
