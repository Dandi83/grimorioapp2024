import { test, expect } from "./fixtures.mjs";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";

// PROMPT 32: «Giorni e ore», «Funzioni», «Pagine rotte e lente» of /admin/statistiche with events written only in the
// local test database. The other tests write events too: the map uses cells of seven weeks ago, the functions are
// checked as what these events add. 390 and 1280.
const PREFIX = "prova-approf2-";

async function database(run) {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try { return await run(client); } finally { await client.end(); }
}

async function signIn(browser, width) {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: 900 } });
  await context.addInitScript(() => { try { window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
  const page = await context.newPage();
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
  return { context, page };
}

async function open(page, period) {
  await page.goto(`/admin/statistiche?periodo=${period}`);
  for (const id of ["giorni-ore", "funzioni", "rotte"]) {
    const card = page.locator(`[data-rest-item="${id}"]`);
    if ((await card.getAttribute("open")) === null) await card.locator("summary").first().click();
    await expect(card).toHaveAttribute("open", "");
  }
}
const functionPeople = page => page.locator("[data-function]").evaluateAll(nodes => Object.fromEntries(nodes.map(node => [node.dataset.function, Number(node.dataset.people)])));
const steps = page => page.locator("[data-two-steps]").evaluateAll(nodes => Object.fromEntries(nodes.map(node => [node.dataset.twoSteps, [Number(node.dataset.from), Number(node.dataset.to)]])));

async function seed() {
  await database(async client => {
    await client.query(`DELETE FROM grimorio_analytics_events WHERE visitor_id LIKE '${PREFIX}%'`);
    const insert = (visitor, event, at, extra = {}) => client.query(
      `INSERT INTO grimorio_analytics_events (id, visitor_id, session_id, view_id, event_name, path, source, is_test, device, metric_ms, exported, received_at)
       VALUES ($1,$2,$3,$4,$5,$6,'direct',false,$7,$8,true, ${at})`,
      [randomUUID(), PREFIX + visitor, extra.session ?? randomUUID(), randomUUID(), event, extra.path ?? "/", extra.device ?? "iphone", extra.ms ?? null]);
    // Seven weeks ago, Rome time: Monday 01:00 (40 visits) and Wednesday 13:00 (30 visits).
    const week = "(date_trunc('week', now() AT TIME ZONE 'Europe/Rome') - interval '49 days')";
    for (let index = 0; index < 40; index++) await insert(`heat-${index}`, "page_view", `(${week} + interval '1 hour') AT TIME ZONE 'Europe/Rome'`);
    for (let index = 0; index < 30; index++) await insert(`heat-${index}`, "page_view", `(${week} + interval '2 days 13 hours') AT TIME ZONE 'Europe/Rome'`);
    // The last days: four people and their uses.
    const recent = "now() - interval '2 hours'";
    for (const person of ["f1", "f2", "f3", "f4"]) await insert(person, "page_view", recent);
    await insert("f1", "filter_apply", recent);
    for (const person of ["f1", "f2"]) await insert(person, "edition_change", recent);
    await insert("f3", "favorite_add", recent);
    await insert("f4", "share_click", recent, { path: "/spell/palla-di-fuoco" });
    for (const person of ["f1", "f2", "f3"]) await insert(person, "proposal_start", recent);
    await insert("f1", "proposal_sent", recent);
    for (const person of ["f2", "f4"]) await insert(person, "install_prompt_shown", recent);
    await insert("f4", "install_prompt_accepted", recent);
    // Pages not found and LCP on phones.
    for (const person of ["f1", "f1", "f2"]) await insert(person, "not_found", recent, { path: "/pagina-rotta-xq" });
    for (const ms of [3000, 3400, 2900]) await insert("f1", "lcp", recent, { path: "/oggetti-magici", ms });
    for (const ms of [5000, 5000]) await insert("f2", "lcp", recent, { path: "/compendio", ms });
    for (const ms of [1000, 1100, 1200]) await insert("f3", "lcp", recent, { path: "/info", ms });
    for (const ms of [9000, 9000, 9000]) await insert("f4", "lcp", recent, { path: "/fonti", ms, device: "computer" });
  });
}

test.describe.configure({ mode: "serial" });
test.afterAll(() => database(client => client.query(`DELETE FROM grimorio_analytics_events WHERE visitor_id LIKE '${PREFIX}%'`)));

test("at 390: map of days and bands with its peaks, functions and two funnels, pages not found and slow", async ({ browser }) => {
  test.setTimeout(180_000);
  const { context, page } = await signIn(browser, 390);
  await open(page, "7");
  const before = { uses: await functionPeople(page), steps: await steps(page) };
  await seed();

  // «Giorni e ore» on 90 days: the two seeded cells are the darkest and the peaks.
  await open(page, "90");
  await expect(page.locator("[data-heat-cell]")).toHaveCount(56);
  await expect(page.locator('[data-heat-cell="0:0"]')).toHaveAttribute("data-visits", /^\d+$/);
  expect(Number(await page.locator('[data-heat-cell="0:0"]').getAttribute("data-visits"))).toBeGreaterThanOrEqual(40);
  await expect(page.locator('[data-heat-cell="0:0"]')).toHaveCSS("background-color", "rgb(122, 31, 43)");
  await expect(page.locator("[data-heat-peak]")).toHaveText("Picco: lunedì 0–3 · mercoledì 12–15");
  await expect(page.locator('[data-rest-item="giorni-ore"]')).toContainText("meno");

  // «Funzioni» on 7 days: what these people add; the funnels as started → finished.
  await open(page, "7");
  const uses = await functionPeople(page), after = await steps(page);
  expect(Object.fromEntries(Object.keys(uses).map(key => [key, uses[key] - before.uses[key]]))).toEqual({ filtri: 1, edizione: 2, preferiti: 1, condivisione: 1 });
  expect(after.proponi[0] - before.steps.proponi[0]).toBe(3);expect(after.proponi[1] - before.steps.proponi[1]).toBe(1);
  expect(after.installa[0] - before.steps.installa[0]).toBe(2);expect(after.installa[1] - before.steps.installa[1]).toBe(1);
  await expect(page.locator('[data-function="filtri"]')).toContainText(/^Filtri\d+% · \d+$/);
  await expect(page.locator('[data-two-steps="proponi"]')).toContainText("modulo aperto → inviato");
  await expect(page.locator('[data-two-steps="installa"]')).toContainText("mostrato → accettato");

  // «Pagine rotte e lente»: the path with its count; only /oggetti-magici is slow (median 3,0 s, 3 measures on phones).
  await expect(page.locator('[data-not-found-row="/pagina-rotta-xq"] [data-value]')).toHaveText("× 3");
  await expect(page.locator('[data-slow-row="/oggetti-magici"] [data-value]')).toHaveText("3 s · 3 misure");
  for (const path of ["/compendio", "/info", "/fonti"]) await expect(page.locator(`[data-slow-row="${path}"]`)).toHaveCount(0);

  // «Ultime 24 ore»: the map needs at least 7 days.
  await open(page, "24h");
  await expect(page.locator('[data-heatmap="poco"]')).toHaveText("Per la mappa servono almeno 7 giorni: scegli un periodo più lungo.");
  await expect(page.locator("[data-heat-cell]")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await open(page, "90");
  if (process.env.STATISTICHE_SHOTS) await page.locator("[data-insights]").screenshot({ path: `${process.env.STATISTICHE_SHOTS}/approfondimenti-2-390.png` });
  await context.close();
});

test("at 1280: the three cards with the others, the map whole, no side scroll", async ({ browser }) => {
  test.setTimeout(120_000);
  const { context, page } = await signIn(browser, 1280);
  await open(page, "90");
  await expect(page.locator("[data-insights] > details")).toHaveCount(7);
  const table = await page.locator("[data-heatmap]").boundingBox(), card = await page.locator('[data-rest-item="giorni-ore"]').boundingBox();
  expect(table.x + table.width).toBeLessThanOrEqual(card.x + card.width);
  await expect(page.locator("[data-heat-peak]")).toHaveText("Picco: lunedì 0–3 · mercoledì 12–15");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
  if (process.env.STATISTICHE_SHOTS) await page.locator("[data-insights]").screenshot({ path: `${process.env.STATISTICHE_SHOTS}/approfondimenti-2-1280.png` });
  await context.close();
});
