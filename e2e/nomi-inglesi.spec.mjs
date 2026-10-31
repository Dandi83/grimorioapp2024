import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";

// PROMPT 33: the official English names of the SRD cards in the search. The visitor at 390 and 1280, in 2024 and 2014:
// «bless», «spy», «fireball», «mind» find the right cards in the Home and in the lists, with the line «in inglese: …»;
// the cards do not change. Then the reserved area: a synonym written as an English name wins, a word found now by an
// English name leaves «Ricerche senza risultato». Local test database only.
const PREFIX = "prova-inglese-";

async function database(run) {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try { return await run(client); } finally { await client.end(); }
}

async function visitor(browser, width, edition) {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: width < 600 ? 844 : 900 } });
  await context.addInitScript(value => {
    try {
      localStorage.setItem("grimorio.edizione", value);
      localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5));
    } catch { /* no storage */ }
  }, edition);
  return context;
}

const suffix = edition => (edition === "2014" ? "-2014" : "");
const inEnglish = (scope, href, name) => scope.locator(`a[href="${href}"]:has([data-in-inglese])`).filter({ hasText: `in inglese: ${name}` });

test.describe.configure({ mode: "serial" });
test.afterAll(() => database(async client => {
  await client.query(`DELETE FROM grimorio_analytics_events WHERE visitor_id LIKE '${PREFIX}%'`).catch(() => {});
  await client.query("DELETE FROM grimorio_search_synonyms WHERE query IN ('bless', 'xqbless')").catch(() => {});
}));

for (const width of [390, 1280]) for (const edition of ["2024", "2014"]) {
  test(`at ${width}, ${edition}: bless, spy, fireball, mind in the Home and in the lists, with «in inglese»`, async ({ browser }) => {
    test.setTimeout(180_000);
    const context = await visitor(browser, width, edition);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(String(error)));

    // The Home: one index, no request more (the index the search already loads).
    await page.goto("/");
    const requests = [];
    page.on("request", request => { if (["fetch", "xhr"].includes(request.resourceType())) requests.push(new URL(request.url()).pathname); });
    await page.getByRole("button", { name: `Cerca nel Grimorio ${edition}…` }).filter({ visible: true }).first().click();
    const dialog = page.getByRole("dialog", { name: "Cerca in tutto il Grimorio" });
    const field = dialog.getByRole("searchbox");
    for (const [query, href, name] of [["bless", `/spell/benedizione${suffix(edition)}`, "Bless"], ["spy", `/mostro/spia${suffix(edition)}`, "Spy"], ["fireball", `/spell/palla-di-fuoco${suffix(edition)}`, "Fireball"]]) {
      await field.fill(query);
      await expect(inEnglish(dialog, href, name), `${edition} ${query}`).toBeVisible();
      // The Italian name stays the name of the result.
      await expect(dialog.locator(`a[href="${href}"]`).first()).toContainText(name === "Spy" ? "Spia" : name === "Bless" ? "Benedizione" : "Palla di fuoco");
    }
    // «mind»: the names starting with it; Mind Spike only in 2024 (in 2014 it waits under «Cerca anche nel 2024»).
    await field.fill("mind");
    await expect(inEnglish(dialog, `/spell/vuoto-mentale${suffix(edition)}`, "Mind Blank")).toBeVisible();
    if (edition === "2024") await expect(inEnglish(dialog, "/spell/aculeo-mentale", "Mind Spike")).toBeVisible();
    else await expect(dialog.locator("[data-in-inglese]", { hasText: "Mind Spike" })).toHaveCount(0);
    // Every English line has a word starting with «mind»; in Incantesimi the names starting with it come first.
    for (const line of await dialog.locator("[data-in-inglese]").allInnerTexts()) expect(line).toMatch(/^in inglese: (.* )?Mind/);
    expect((await dialog.locator('section[aria-labelledby="gruppo-incantesimi"] [data-in-inglese]').allInnerTexts())[0]).toMatch(/^in inglese: Mind/);
    // The Italian name typed: no English line.
    await field.fill("benedizione");
    await expect(dialog.locator(`a[href="/spell/benedizione${suffix(edition)}"]`)).toBeVisible();
    await expect(dialog.locator("[data-in-inglese]")).toHaveCount(0);
    // No endpoint of its own: besides /api/analytics, only the index and the pages prefetched by the links.
    expect(requests.filter(path => path.startsWith("/api/") && path !== "/api/analytics"), requests.join(" ")).toEqual([]);
    expect(requests.filter(path => path === "/ricerca-indice.json").length).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (process.env.INGLESE_SHOTS) {
      await field.fill("bless");
      await page.screenshot({ path: `${process.env.INGLESE_SHOTS}/home-bless-${width}-${edition}.png` });
    }

    // The lists of Incantesimi and Bestiario.
    await page.goto("/grimorio");
    const spells = page.getByRole("searchbox", { name: "Cerca un incantesimo" }).filter({ visible: true }).first();
    for (const [query, id, name] of [["bless", "benedizione", "Bless"], ["fireball", "palla-di-fuoco", "Fireball"], ["mind", "vuoto-mentale", "Mind Blank"]]) {
      await spells.fill(query);
      await expect(inEnglish(page, `/spell/${id}${suffix(edition)}`, name).filter({ visible: true }).first(), `list ${edition} ${query}`).toBeVisible();
    }
    await spells.fill("palla di fuoco");
    await expect(page.locator(`a[href="/spell/palla-di-fuoco${suffix(edition)}"]`).filter({ visible: true }).first()).toBeVisible();
    await expect(page.locator("[data-in-inglese]").filter({ visible: true })).toHaveCount(0);
    if (process.env.INGLESE_SHOTS) {
      await spells.fill("fireball");
      await page.screenshot({ path: `${process.env.INGLESE_SHOTS}/incantesimi-fireball-${width}-${edition}.png` });
    }
    await page.goto("/bestiario");
    const creatures = page.getByRole("searchbox", { name: "Cerca una creatura" }).filter({ visible: true }).first();
    await creatures.fill("spy");
    await expect(inEnglish(page, `/mostro/spia${suffix(edition)}`, "Spy").filter({ visible: true }).first()).toBeVisible();

    // The card does not change: no English name on it.
    await page.goto(`/spell/benedizione${suffix(edition)}`);
    await expect(page.getByRole("heading", { level: 1 }).filter({ visible: true }).first()).toContainText("Benedizione");
    await expect(page.locator("[data-in-inglese]")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(errors).toEqual([]);
    await context.close();
  });
}

test("magic items: «bag of holding» finds Borsa conservante with «in inglese»", async ({ browser }) => {
  const context = await visitor(browser, 390, "2024");
  const page = await context.newPage();
  await page.goto("/oggetti-magici");
  await page.getByRole("searchbox").filter({ visible: true }).first().fill("bag of holding");
  await expect(inEnglish(page, "/oggetti-magici/borsa-conservante", "Bag of Holding")).toBeVisible();
  await context.close();
});

test("reserved area: a synonym written as an English name wins; «fireball» leaves «Ricerche senza risultato»", async ({ browser }) => {
  test.setTimeout(180_000);
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 900 } });
  await context.addInitScript(() => { try { localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
  const page = await context.newPage();
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
  // The statistics page makes its tables; then the data of the test.
  await page.goto("/admin/statistiche?periodo=7");
  // Two searches with no result of before: «fireball» (found now by its English name) and «xqbless».
  await database(async client => {
    await client.query(`DELETE FROM grimorio_analytics_events WHERE visitor_id LIKE '${PREFIX}%'`);
    for (const query of ["fireball", "xqbless"]) await client.query(
      `INSERT INTO grimorio_analytics_events (id, visitor_id, session_id, view_id, event_name, path, source, is_test, device, exported, received_at, search_query, search_results, search_area)
       VALUES ($1,$2,$3,$4,'search','/','direct',false,'iphone',true, now() - interval '2 hours', $5, 0, 'globale')`,
      [randomUUID(), PREFIX + "a", randomUUID(), randomUUID(), query]);
    // A synonym of before, written as the English name of Benedizione, on another card.
    await client.query("INSERT INTO grimorio_search_synonyms (query, href) VALUES ('bless', '/spell/palla-di-fuoco') ON CONFLICT (query) DO UPDATE SET href = EXCLUDED.href");
  });
  await page.goto("/admin/statistiche?periodo=7");
  const card = page.locator('[data-rest-item="ricerche"]');
  if ((await card.getAttribute("open")) === null) await card.locator("summary").first().click();
  await expect(page.locator('[data-insight-row="xqbless"]')).toBeVisible();
  await expect(page.locator('[data-insight-row="fireball"]')).toHaveCount(0);

  // «xqbless» → Palla di fuoco from the form: the index of the public is made again, with «bless» too.
  const row = page.locator('[data-insight-row="xqbless"]');
  await row.locator("summary", { hasText: "Aggiungi sinonimo" }).click();
  await row.getByRole("combobox", { name: "Scheda per «xqbless»" }).fill("Palla di fuoco");
  await row.getByRole("button", { name: "Collega" }).click();
  await expect(page.locator('[data-synonym-row="xqbless"]')).toBeVisible();
  const index = async () => (await context.request.get("/ricerca-indice.json")).json();
  await expect.poll(async () => JSON.stringify((await index()).syn ?? [])).toContain("xqbless");
  const served = await index();
  expect(served.syn.map(([query]) => query)).toContain("bless");
  expect(served.en.some(([name]) => name === "Bless"), "the English name written as a synonym leaves the index").toBe(false);
  expect(served.en.some(([name]) => name === "Fireball")).toBe(true);

  // The visitor: «bless» opens the card of the synonym, Benedizione is not found by it.
  const pub = await (await visitor(browser, 390, "2024")).newPage();
  await pub.goto("/?cerca=bless");
  const dialog = pub.getByRole("dialog", { name: "Cerca in tutto il Grimorio" });
  await expect(dialog.locator('a[href="/spell/palla-di-fuoco"]')).toBeVisible();
  await expect(dialog.locator('a[href="/spell/benedizione"]')).toHaveCount(0);
  await expect(dialog.locator("[data-in-inglese]")).toHaveCount(0);
  await pub.context().close();

  // Both synonyms taken away from the reserved area: the index has «Bless» again.
  for (const query of ["xqbless", "bless"]) await page.getByRole("button", { name: `Togli il sinonimo «${query}»` }).click();
  await expect(page.locator("[data-synonym-row]")).toHaveCount(0);
  await expect.poll(async () => (await index()).en.some(([name]) => name === "Bless")).toBe(true);
  await context.close();
});
