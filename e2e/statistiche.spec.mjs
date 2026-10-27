import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";

// /admin/statistiche «Una domanda alla volta»: the administrator sees the page with charts and events (test data
// written only in the local test database); others get the passcode request; without consent nothing is sent.
const SHOTS = process.env.STATISTICHE_SHOTS;

async function login(page) {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByRole("heading", { name: "Amministrazione" })).toBeVisible();
}

/** Consented events of four people over the last days: origins, devices, the installed app, cards and searches. */
async function seed() {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  const rows = [];
  const add = (visitor, session, daysAgo, event, extra = {}) => rows.push({ id: randomUUID(), visitor, session, view: randomUUID(), daysAgo, event, path: "/", ...extra });
  const [a, b, c, d] = ["a", "b", "c", "d"].map(name => `prova-statistiche-${name}`);
  const sessions = Object.fromEntries([a, b, c, d].map(visitor => [visitor, [randomUUID(), randomUUID()]]));
  add(a, sessions[a][0], 1, "page_view", { origin: "instagram", device: "iphone", installed: true, path: "/grimorio" });
  add(a, sessions[a][1], 0, "page_view", { origin: "instagram", device: "iphone", installed: true, path: "/spell/palla-di-fuoco" });
  add(a, sessions[a][1], 0, "card_open", { path: "/spell/palla-di-fuoco", kind: "spell", card: "palla-di-fuoco", title: "Palla di fuoco" });
  add(a, sessions[a][1], 0, "card_open", { path: "/spell/palla-di-fuoco", kind: "spell", card: "palla-di-fuoco", title: "Palla di fuoco" });
  add(b, sessions[b][0], 1, "page_view", { origin: "instagram", device: "android", installed: false, path: "/bestiario" });
  add(b, sessions[b][0], 1, "card_open", { path: "/mostro/lich-2014", kind: "monster", card: "lich-2014", title: "Lich" });
  add(c, sessions[c][0], 0, "page_view", { origin: "google", device: "computer", installed: false, path: "/compendio/condizioni" });
  add(d, sessions[d][0], 0, "page_view", { origin: "diretto", device: "iphone", installed: false, path: "/" });
  for (const visitor of [a, b, c]) add(visitor, sessions[visitor][0], 0, "search", { query: "drago rossa", results: 0 });
  await client.query("DELETE FROM grimorio_analytics_events WHERE visitor_id LIKE 'prova-statistiche-%'");
  for (const row of rows) {
    await client.query(
      `INSERT INTO grimorio_analytics_events (id, visitor_id, session_id, view_id, event_name, path, card_kind, card_id, title, source, is_test,
        origin, device, installed, search_query, search_results, exported, received_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'direct',false,$10,$11,$12,$13,$14,true, now() - make_interval(days => $15))`,
      [row.id, row.visitor, row.session, row.view, row.event, row.path, row.kind ?? null, row.card ?? null, row.title ?? null,
        row.origin ?? null, row.device ?? null, row.installed ?? null, row.query ?? null, row.results ?? null, row.daysAgo]);
  }
  await client.end();
}

async function cleanup() {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  await client.query("DELETE FROM grimorio_analytics_events WHERE visitor_id LIKE 'prova-statistiche-%'");
  await client.end();
}

test("statistics: the administrator sees the questions with charts and marked events; others never", async ({ page, browser, request }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  // The first visit creates the tables, with the Instagram opening already marked.
  await page.goto("/admin/statistiche");
  await expect(page.getByRole("heading", { level: 1, name: "Statistiche" })).toBeVisible();
  await seed();
  await page.goto("/admin/statistiche?periodo=7");
  await expect(page.getByRole("combobox", { name: "Periodo" })).toHaveValue("7");
  await expect(page.locator("[data-in-breve]")).toContainText("Questa settimana 4 persone hanno usato il Grimorio.");
  await expect(page.locator("[data-people]")).toHaveText("4");
  const daily = page.locator('svg[data-chart="giorni"]');
  await expect(daily).toHaveAttribute("aria-label", /Persone al giorno dal .* massimo 3/);
  await expect(page.locator('svg[data-chart="anello"]')).toHaveAttribute("aria-label", /^25% delle persone è tornato .*: 1 su 4\.$/);
  await expect(page.locator("[data-installed]")).toContainText("1 la usano dall’app installata sulla schermata Home.");
  await expect(page.locator('svg[data-chart="barre"]')).toHaveAttribute("aria-label", "Provenienza di 4 persone: Instagram 50%, Diretto 25%, Google 25%, Link condivisi 0%, Altro 0%.");
  await expect(page.locator("[data-devices]")).toHaveText("Su iPhone 50% · Android 25% · computer 25%");
  await expect(page.locator('[data-area="Incantesimi"]')).toContainText("50%");
  await expect(page.locator("[data-top-cards] li").first()).toContainText("Palla di fuoco");
  await expect(page.locator("[data-top-cards] li").filter({ hasText: "Lich" })).toContainText("2014");
  await expect(page.locator("[data-not-found]")).toContainText("«drago rossa» × 3");
  await expect(page.getByRole("link", { name: "Totale di tutti i visitatori su Vercel Analytics" })).toHaveAttribute("href", "https://vercel.com/grimorio-app/grimorioapp2024/analytics");
  // The period menu: «Da quando c’è Instagram», with the dashed line of the opening on the chart.
  await page.getByRole("combobox", { name: "Periodo" }).selectOption("instagram");
  await expect(page).toHaveURL(/periodo=instagram/);
  await expect(page.locator('svg[data-chart="giorni"] [data-marker="2026-10-26"]')).toHaveCount(1);
  await expect(daily).toHaveAttribute("aria-label", /Eventi: Apertura profilo Instagram il lunedì 26 ottobre\./);
  // «+ Segna un evento»: added on today's chart, then cancelled.
  await page.getByRole("button", { name: "+ Segna un evento" }).click();
  await page.getByLabel("Cosa è successo").fill("Prova evento e2e");
  await page.getByRole("button", { name: "Salva l’evento" }).click();
  await expect(page.locator("[data-marker-row]").filter({ hasText: "Prova evento e2e" })).toHaveCount(1);
  await expect(daily).toHaveAttribute("aria-label", /Prova evento e2e/);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/statistiche-390.png`, fullPage: true });
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `${width}`).toBeLessThanOrEqual(width);
  }
  await page.getByRole("button", { name: "Cancella l’evento Prova evento e2e" }).click();
  await expect(page.locator("[data-marker-row]").filter({ hasText: "Prova evento e2e" })).toHaveCount(0);

  // Not the administrator: the passcode, never the numbers, private answers.
  const guest = await (await browser.newContext({ baseURL: test.info().project.use.baseURL })).newPage();
  await guest.goto("/admin/statistiche?periodo=7");
  await expect(guest.getByLabel("Passcode")).toBeVisible();
  const html = await (await request.get("/admin/statistiche?periodo=7")).text();
  expect(html).not.toMatch(/Quante persone|drago rossa|prova-statistiche|Apertura profilo Instagram/);
  await guest.close();
  await cleanup();
});

test("without consent no event is sent: page views, cards and searches stay in the browser", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => { try { localStorage.setItem("grimorio.edizione", "2024"); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
  const page = await context.newPage();
  const sent = [];
  page.on("request", request => { if (request.method() === "POST" && new URL(request.url()).pathname === "/api/analytics") sent.push(request.postData()); });
  await page.goto("/");
  await page.goto("/grimorio");
  await page.getByRole("searchbox").first().fill("drago rossa");
  await page.waitForTimeout(2500);
  await page.goto("/spell/palla-di-fuoco");
  await page.goto("/bestiario");
  await page.getByRole("searchbox", { name: "Cerca una creatura" }).fill("zzz senza risultati");
  await page.waitForTimeout(2500);
  expect(sent).toEqual([]);
  expect(await context.cookies()).not.toContainEqual(expect.objectContaining({ name: "grimorio_statistics_visitor" }));
  await context.close();
});
