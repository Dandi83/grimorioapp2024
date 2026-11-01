import { test, expect } from "./fixtures.mjs";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";

// PROMPT 30: «Ultime 24 ore» in /admin/statistiche: first in the menu, a moving window of 24 hours up to now and the
// 24 hours before; the tiles, «ora migliore», «Andamento ora per ora» with 24 bars and the marked event on its hour;
// the other periods as before. Events written only in the local test database. 390 and 1280.
const PREFIX = "prova-24-ore-";

async function database(run) {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try { return await run(client); } finally { await client.end(); }
}

async function login(page) {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
}

/**
 * «e» 30 minutes ago from Instagram with the app on iPhone, installed 20 minutes ago; «f» 150 and 20 minutes ago in two
 * sessions (back), on Android; «g» 30 hours ago (the 24 hours before); «h» 50 hours ago (outside both windows).
 */
async function seed() {
  await database(async client => {
    await client.query(`DELETE FROM grimorio_analytics_events WHERE visitor_id LIKE '${PREFIX}%'`);
    const add = (visitor, session, minutesAgo, event, extra = {}) => client.query(
      `INSERT INTO grimorio_analytics_events (id, visitor_id, session_id, view_id, event_name, path, source, is_test, origin, device, installed, exported, received_at)
       VALUES ($1,$2,$3,$4,$5,'/','direct',false,$6,$7,$8,true, now() - make_interval(mins => $9))`,
      [randomUUID(), PREFIX + visitor, session, randomUUID(), event, extra.origin ?? null, extra.device ?? null, extra.installed ?? null, minutesAgo]);
    const [e, f1, f2, g, h] = Array.from({ length: 5 }, () => randomUUID());
    await add("e", e, 30, "page_view", { origin: "instagram", device: "iphone", installed: true });
    await add("e", e, 20, "app_installed");
    await add("f", f1, 150, "page_view", { origin: "diretto", device: "android", installed: false });
    await add("f", f2, 20, "page_view", { origin: "diretto", device: "android", installed: false });
    await add("g", g, 30 * 60, "page_view", { origin: "google", device: "computer", installed: false });
    await add("h", h, 50 * 60, "page_view", { origin: "google", device: "computer", installed: false });
  });
}

test.describe.configure({ mode: "serial" });
test.afterAll(() => database(client => client.query(`DELETE FROM grimorio_analytics_events WHERE visitor_id LIKE '${PREFIX}%'`)));

for (const width of [390, 1280]) {
  test(`«Ultime 24 ore» at ${width}: first in the menu, tiles, 24 bars, the event on its hour; the other periods unchanged`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 900 });
    await login(page);
    await page.goto("/admin/statistiche");
    await seed();
    // The default period stays «Ultimi 30 giorni»; «Ultime 24 ore» is the first voice of the menu.
    const menu = page.getByRole("combobox", { name: "Periodo" });
    await page.reload();
    await expect(menu).toHaveValue("30");
    await expect(menu.locator("option")).toHaveText(["Ultime 24 ore", "Ultimi 7 giorni", "Ultimi 30 giorni", "Ultimi 90 giorni", "Da quando c’è Instagram"]);
    await menu.selectOption("24h");
    await expect(page).toHaveURL(/periodo=24h/);

    const tile = name => page.locator(`[data-tile="${name}"]`);
    // e and f in the window; g only in the 24 hours before: 2 against 1, +100%.
    await expect(tile("persone").locator("[data-tile-value]")).toHaveText("2");
    await expect(tile("persone").locator("[data-arrow]")).toContainText("100%");
    await expect(tile("persone").locator("[data-tile-detail]")).toHaveText(/^ora migliore: \d\d:\d\d–\d\d:\d\d, 2$/);
    await expect(tile("persone").locator('svg[data-chart="persone"]')).toHaveAttribute("aria-label", /^Persone ora per ora dalle \d\d:\d\d: (\d+, ){23}\d+\.$/);
    await expect(tile("tornano").locator("[data-tile-value]")).toHaveText("50%");
    await expect(tile("app").locator("[data-tile-value]")).toHaveText("1");
    await expect(tile("app").locator("[data-app-split]")).toHaveText("Android 0 · iPhone 1");
    await expect(tile("app").locator("[data-installs]")).toHaveText("1 nuova installazione");
    await expect(tile("provenienza").locator("h2")).toHaveText(/Da (Instagram|diretto)/);
    await expect(tile("provenienza").locator("[data-tile-value]")).toHaveText("50%");
    await expect(page.locator("[data-tiles-note]")).toHaveText("Ultime 24 ore · i tuoi dispositivi non contano");
    await expect(page.locator("[data-period-line]")).toContainText("ultime 24 ore fino ad adesso");

    // «Andamento ora per ora»: 24 bars; the last hour has e and f, the one of 150 minutes ago f.
    const item = page.locator('[data-rest-item="andamento"]');
    await expect(item.locator("summary")).toContainText("Andamento ora per ora");
    if (!(await item.getAttribute("open"))) await item.locator("summary").click();
    const chart = page.locator('svg[data-chart="ore"]');
    await expect(chart).toBeVisible();
    const bars = chart.locator("[data-hour-bar]");
    await expect(bars).toHaveCount(24);
    const visitors = await bars.evaluateAll(nodes => nodes.map(node => Number(node.getAttribute("data-visitors"))));
    expect(visitors[23]).toBe(2);
    expect(visitors[21]).toBe(1);
    expect(visitors.reduce((sum, value) => sum + value, 0)).toBe(3);
    const labels = await bars.evaluateAll(nodes => nodes.map(node => node.getAttribute("data-hour-bar")));
    expect(new Set(labels).size).toBe(24);
    for (const label of labels) expect(label).toMatch(/^\d\d:\d\d–\d\d:\d\d/);
    await expect(chart.locator("[data-hour-tick]")).toHaveCount(6);
    await expect(page.locator('svg[data-chart="giorni"]')).toHaveCount(0);

    // An event at the Rome hour of now: its dashed line on the bar that holds that hour, then cancelled.
    const hour = Number(new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
    await page.getByRole("button", { name: "+ Segna un evento" }).click();
    await page.getByLabel("Ora (facoltativa)").selectOption(String(hour));
    await page.getByLabel("Cosa è successo").fill("Sponsorizzata su IG prova");
    await page.getByRole("button", { name: "Salva l’evento" }).click();
    const row = page.locator("[data-marker-row]").filter({ hasText: "Sponsorizzata su IG prova" });
    await expect(row).toContainText(`alle ${String(hour).padStart(2, "0")}:00`);
    const marker = chart.locator("[data-marker]").filter({ hasText: "Sponsorizzata su IG prova" });
    await expect(marker).toHaveCount(1);
    // The marker stands on the bar whose 60 minutes hold hh:00 of today.
    const on = await marker.getAttribute("data-marker");
    const [from, to] = on.slice(0, 11).split("–");
    const minutes = text => Number(text.slice(0, 2)) * 60 + Number(text.slice(3));
    const at = hour * 60, inside = minutes(from) <= minutes(to) ? at >= minutes(from) && at < minutes(to) : at >= minutes(from) || at < minutes(to);
    expect(inside, `${hour}:00 in ${on}`).toBe(true);
    await expect(chart).toHaveAttribute("aria-label", /Eventi: Sponsorizzata su IG prova tra le /);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (process.env.STATISTICHE_SHOTS) await page.screenshot({ path: `${process.env.STATISTICHE_SHOTS}/statistiche-24-ore-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Cancella l’evento Sponsorizzata su IG prova" }).click();
    await expect(row).toHaveCount(0);

    // The other periods as before: days of the calendar, «giorno migliore», the chart of the days.
    await menu.selectOption("7");
    await expect(page).toHaveURL(/periodo=7/);
    await expect(page.locator("[data-tiles-note]")).toHaveText("Ultimi 7 giorni · i tuoi dispositivi non contano");
    await expect(tile("persone").locator("[data-tile-detail]")).toContainText(/^giorno migliore: /);
    await expect(item.locator("summary")).toContainText("Andamento giorno per giorno");
    await expect(page.locator('svg[data-chart="giorni"]')).toHaveCount(1);
    await expect(page.locator('svg[data-chart="ore"]')).toHaveCount(0);
    await expect(page.locator("[data-period-line]")).toContainText("ultimi 7 giorni (dal ");
  });
}
