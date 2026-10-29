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
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
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
  // One card read under its old id and its current one (a duplicate merged into the kept row): one line, 3 readings.
  add(b, sessions[b][0], 1, "card_open", { path: "/spell/i-re-spirare-sott-acqua", kind: "spell", card: "i-re-spirare-sott-acqua", title: "Respirare sott'acqua" });
  add(c, sessions[c][0], 0, "card_open", { path: "/spell/i-re-spirare-sott-acqua-2", kind: "spell", card: "i-re-spirare-sott-acqua-2", title: "Respirare sott'acqua" });
  add(d, sessions[d][0], 0, "card_open", { path: "/spell/i-re-spirare-sott-acqua-2", kind: "spell", card: "i-re-spirare-sott-acqua-2", title: "Respirare sott'acqua" });
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
  // «Quattro tessere» (PROMPT 16): 2×2 on the phone.
  const tile = name => page.locator(`[data-tile="${name}"]`);
  await expect(page.locator("[data-tile]")).toHaveCount(4);
  await expect(tile("persone").locator("h2")).toHaveText("Persone");
  await expect(tile("persone").locator("[data-tile-value]")).toHaveText("4");
  await expect(tile("persone")).toHaveCSS("background-color", "rgb(43, 33, 24)");
  await expect(tile("persone").locator("[data-tile-value]")).toHaveCSS("font-size", "46px");
  await expect(tile("persone").locator('svg[data-chart="persone"]')).toHaveAttribute("aria-label", /^Persone al giorno dal .*: (\d+, )*\d+\.$/);
  await expect(tile("persone").locator("[data-tile-detail]")).toContainText(/^giorno migliore: \d+ \S+, 3$/);
  // No period before with people: no arrow, and no «nessun confronto» in the tiles.
  await expect(page.locator("[data-tiles] [data-arrow]")).toHaveCount(0);
  await expect(page.locator("[data-tiles]")).not.toContainText("confronto");
  await expect(tile("tornano").locator("[data-tile-value]")).toHaveText("25%");
  await expect(tile("tornano").locator('svg[data-chart="anello"]')).toHaveAttribute("aria-label", /^25% delle persone è tornato .*: 1 su 4\.$/);
  await expect(tile("tornano").locator("[data-tile-detail]")).toHaveText("1 su 4 sono tornate almeno una volta");
  await expect(tile("app").locator("h2")).toHaveText("Usano l’app");
  await expect(tile("app").locator("[data-tile-value]")).toHaveText("1");
  await expect(tile("app").locator("[data-tile-value]")).toHaveCSS("color", "rgb(31, 107, 69)");
  await expect(tile("provenienza").locator("h2")).toHaveText("Da Instagram");
  await expect(tile("provenienza").locator("h2")).toHaveCSS("text-transform", "uppercase");
  await expect(tile("provenienza").locator("[data-tile-value]")).toHaveText("50%");
  await expect(tile("provenienza").locator("[data-tile-detail]")).toHaveText("diretto 25% · Google 25%");
  await expect(tile("provenienza").locator('[data-chart="provenienze"]')).toHaveAttribute("aria-label", "Provenienza di 4 persone: Instagram 50%, Diretto 25%, Google 25%, Link condivisi 0%, Altro 0%.");
  await expect(page.locator("[data-tiles-note]")).toHaveText("Ultimi 7 giorni · i tuoi dispositivi non contano");
  const box = async name => (await tile(name).boundingBox());
  expect((await box("persone")).y).toBe((await box("tornano")).y);
  expect((await box("app")).y).toBeGreaterThan((await box("persone")).y);
  // «Il resto»: every item closed; opened, it stays open after a reload.
  const items = page.locator("[data-rest-item]");
  await expect(items).toHaveCount(7);
  await expect(page.locator("[data-rest-item][open]")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Tornano?" })).toHaveCount(0);
  const daily = page.locator('svg[data-chart="giorni"]');
  await expect(daily).toBeHidden();
  await page.locator('[data-rest-item="andamento"] > summary').click();
  await page.locator('[data-rest-item="usano"] > summary').click();
  await expect(daily).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-rest-item="andamento"]')).toHaveAttribute("open", "");
  await expect(page.locator('[data-rest-item="usano"]')).toHaveAttribute("open", "");
  await expect(page.locator('[data-rest-item="arrivano"]')).not.toHaveAttribute("open", "");
  await page.locator('[data-rest-item="arrivano"] > summary').click();
  await expect(daily).toHaveAttribute("aria-label", /Persone al giorno dal .* massimo 3/);
  await expect(page.locator('svg[data-chart="barre"]')).toHaveAttribute("aria-label", "Provenienza di 4 persone: Instagram 50%, Diretto 25%, Google 25%, Link condivisi 0%, Altro 0%.");
  await expect(page.locator("[data-devices]")).toHaveText("Su iPhone 50% · Android 25% · computer 25%");
  await expect(page.locator('[data-area="Incantesimi"]')).toContainText("50%");
  // Merged, «Respirare sott'acqua» (1 + 2 readings) comes before «Palla di fuoco» (2).
  await expect(page.locator("[data-top-cards] li").nth(0)).toContainText("Respirare sott'acqua");
  await expect(page.locator("[data-top-cards] li").nth(1)).toContainText("Palla di fuoco");
  await expect(page.locator("[data-top-cards] li").filter({ hasText: "Lich" })).toContainText("2014");
  // The duplicate merged into the kept card: one line with the readings of both ids.
  await expect(page.locator("[data-top-cards] li").filter({ hasText: "Respirare sott'acqua" })).toHaveCount(1);
  await expect(page.locator('[data-top-card="spell:i-re-spirare-sott-acqua-2"] [data-top-card-opens]')).toHaveText("3");
  await expect(page.locator("[data-not-found]")).toContainText("«drago rossa» × 3");
  await expect(page.getByRole("link", { name: "Totale di tutti i visitatori su Vercel Analytics", includeHidden: true })).toHaveAttribute("href", "https://vercel.com/grimorio-app/grimorioapp2024/analytics");
  // The period menu: «Da quando c’è Instagram», with the dashed line of the opening on the chart.
  await page.getByRole("combobox", { name: "Periodo" }).selectOption("instagram");
  await expect(page).toHaveURL(/periodo=instagram/);
  // The period changes everything: the note under the tiles too.
  await expect(page.locator("[data-tiles-note]")).toHaveText("Da quando c’è Instagram · i tuoi dispositivi non contano");
  await expect(page.locator('[data-rest-item="andamento"]')).toHaveAttribute("open", "");
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
  // From 1024 px the four tiles stand in one row, in this order.
  await page.setViewportSize({ width: 1280, height: 900 });
  const row = await Promise.all(["persone", "tornano", "app", "provenienza"].map(box));
  expect(new Set(row.map(tileBox => Math.round(tileBox.y))).size).toBe(1);
  expect(row.map(tileBox => tileBox.x)).toEqual([...row.map(tileBox => tileBox.x)].sort((a, b) => a - b));
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/statistiche-1280.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
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

test("where the statistics are off (previews, other hosts, this test server): nothing is sent, no visitor ID", async ({ browser }) => {
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

/** The statistics of the browser with consent given (the test server never collects: no PostHog, local host). */
async function withConsent(context, sent, { consent = "accepted", excluded = false } = {}) {
  await context.route("**/api/analytics", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json: { enabled: true, excluded, consent } });
    sent.push(JSON.parse(route.request().postData() || "{}"));
    return route.fulfill({ json: { ok: true, stored: true } });
  });
}
/** The site opened as the app installed on the Home screen (display-mode standalone, navigator.standalone on iPhone). */
async function standalone(context) {
  await context.addInitScript(() => {
    const media = window.matchMedia.bind(window);
    window.matchMedia = query => (query.includes("display-mode: standalone") ? { matches: true, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false } : media(query));
    Object.defineProperty(Navigator.prototype, "standalone", { configurable: true, get: () => true });
    try { localStorage.setItem("grimorio.edizione", "2024"); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ }
  });
}

test("installed app: the first opening from the icon is sent once, with the device; without consent nothing", async ({ browser }) => {
  const options = { baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 }, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" };
  const context = await browser.newContext(options);
  await standalone(context);
  const sent = [];
  await withConsent(context, sent);
  const page = await context.newPage();
  await page.goto("/");
  await expect.poll(() => sent.filter(event => event.event === "first_standalone_open").length).toBe(1);
  const first = sent.find(event => event.event === "first_standalone_open");
  expect(first.device).toBe("iphone");
  expect(first.path).toBe("/");
  // Other pages, a reload, a new start of the app: never again from this device.
  // Each view is waited for before moving on: a reload too early would cancel the one of the page left.
  const views = () => sent.filter(event => event.event === "page_view").length;
  await expect.poll(views).toBeGreaterThanOrEqual(1);
  await page.goto("/grimorio");
  await expect.poll(views).toBeGreaterThanOrEqual(2);
  await page.reload();
  await expect.poll(views).toBeGreaterThanOrEqual(3);
  const again = await context.newPage();
  await again.goto("/bestiario");
  await expect.poll(views).toBeGreaterThanOrEqual(4);
  expect(sent.filter(event => event.event === "first_standalone_open")).toHaveLength(1);
  expect(sent.filter(event => event.event === "page_view").every(event => event.installed === true)).toBe(true);
  // The browser says the app was installed (Android, computer): app_installed with the device.
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect.poll(() => sent.filter(event => event.event === "app_installed").length).toBe(1);
  await context.close();

  // Not answered yet: counted at once (28 October 2026), the installation too. «No» (also pressed before): nothing.
  for (const consent of [null, "rejected"]) {
    const other = await browser.newContext(options);
    await standalone(other);
    const none = [];
    await withConsent(other, none, { consent });
    const view = await other.newPage();
    await view.goto("/");
    if (consent === null) await expect.poll(() => none.filter(event => event.event === "page_view").length).toBeGreaterThanOrEqual(1);
    await view.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
    await view.goto("/grimorio");
    await view.waitForTimeout(1500);
    if (consent === null) expect(none.some(event => event.event === "app_installed")).toBe(true);
    else expect(none, String(consent)).toEqual([]);
    await other.close();
  }
});

test("the administrator's device: excluded at the login and still after «Esci»; the button also excludes a device", async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  const mark = async () => (await page.context().cookies()).find(cookie => cookie.name === "grimorio_statistics_excluded");
  expect((await mark())?.value).toBe("1");
  expect((await mark())?.httpOnly).toBe(true);
  // 400 days: the longest a browser keeps a cookie, renewed at every visit.
  expect((await mark()).expires - Date.now() / 1000).toBeGreaterThan(399 * 24 * 3600);
  await page.goto("/admin/statistiche");
  await expect(page.getByText("Questo dispositivo: escluso dalle statistiche ✓")).toBeVisible();
  await page.locator('[data-rest-item="contano"] > summary').click();
  await expect(page.getByText("Le installazioni si contano per chi non ha rinunciato alle statistiche. Su iPhone si contano al primo avvio dall’icona.")).toBeVisible();
  await expect(page.locator("[data-counting-since]")).toHaveText("Dal 28 ottobre 2026 si contano tutti i visitatori tranne chi rinuncia (prima solo chi accettava).");
  await expect(page.locator("[data-installs]")).toContainText(/^\d+ nuov[ae] installazion[ei]$/);
  await expect(page.locator("[data-installs-detail]")).toContainText(/^Android \d+ · iPhone \d+$/);
  await expect(page.locator('[data-tile="app"] [data-tile-value]')).toHaveText(/^\d+$/);
  // «Esci»: the session ends, the device stays excluded.
  await page.goto("/admin");
  await page.getByRole("button", { name: "Esci", exact: true }).click();
  await expect(page.getByLabel("Passcode")).toBeVisible();
  expect((await mark())?.value).toBe("1");
  const status = await page.evaluate(async () => (await fetch("/api/analytics", { cache: "no-store" })).json());
  expect(status.excluded).toBe(true);
  // A device without the mark (another storage, such as the app on iPhone): «Non contare questo dispositivo».
  await page.context().clearCookies({ name: "grimorio_statistics_excluded" });
  await login(page);
  await page.context().clearCookies({ name: "grimorio_statistics_excluded" });
  await page.goto("/admin/statistiche");
  await page.getByRole("button", { name: "Non contare questo dispositivo" }).click();
  await expect(page.getByText("Questo dispositivo: escluso dalle statistiche ✓")).toBeVisible();
  expect((await mark())?.value).toBe("1");
  // Visitors never see any of it.
  const guest = await (await request.get("/privacy")).text();
  expect(guest).toContain("la prima apertura dall’icona");
  expect(guest).not.toMatch(/Non contare questo dispositivo|grimorio_statistics_excluded/);
});
