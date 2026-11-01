import { test, expect } from "./fixtures.mjs";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";

// PROMPT 31: «Approfondimenti» of /admin/statistiche with events written only in the local test database: the searches
// with no result (reason, synonym that the public search then finds, «Da fare»), the path, the arrivals from Instagram
// with the link of the bio and «Copia», who stays. The other tests write events too: the numbers are checked as what
// these events add. 390 and 1280.
const PREFIX = "prova-approf-";

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

/** The four cards opened, on the period of 7 days. */
async function openInsights(page) {
  await page.goto("/admin/statistiche?periodo=7");
  for (const id of ["ricerche", "percorso", "instagram", "restano"]) {
    const card = page.locator(`[data-rest-item="${id}"]`);
    if ((await card.getAttribute("open")) === null) await card.locator("summary").first().click();
    await expect(card).toHaveAttribute("open", "");
  }
}
const funnelNumbers = page => page.locator("[data-funnel-step]").evaluateAll(nodes => Object.fromEntries(nodes.map(node => [node.dataset.funnelStep, Number(node.dataset.people)])));
const instagramPeople = async (page, name) => Number((await page.locator(`[data-insight-row="${name}"] [data-value]`).textContent()).split(" · ")[0].replace(/\D/g, ""));

/**
 * a: from the link of the bio two days ago, opens a card and saves it, back yesterday in another session; b: from Instagram
 * (no bio), applies a filter; c: direct, searches twice «palla di fuocco» and once «fireballxq» with no result, installs the
 * app; e: arrived 21 days ago from Instagram and back 14 days ago (the table of «Chi resta davvero»).
 */
async function seed() {
  await database(async client => {
    await client.query(`DELETE FROM grimorio_analytics_events WHERE visitor_id LIKE '${PREFIX}%'`);
    const add = (visitor, session, hoursAgo, event, extra = {}) => client.query(
      `INSERT INTO grimorio_analytics_events (id, visitor_id, session_id, view_id, event_name, path, source, is_test, origin, device, installed, entry,
        search_query, search_results, search_area, filter_group, exported, received_at)
       VALUES ($1,$2,$3,$4,$5,$6,'direct',false,$7,'iphone',false,$8,$9,$10,$11,$12,true, now() - make_interval(hours => $13))`,
      [randomUUID(), PREFIX + visitor, session, randomUUID(), event, extra.path ?? "/", extra.origin ?? null, extra.entry ?? null,
        extra.query ?? null, extra.results ?? null, extra.area ?? null, extra.group ?? null, hoursAgo]);
    const [a1, a2, b, c, e1, e2] = Array.from({ length: 6 }, () => randomUUID());
    await add("a", a1, 48, "page_view", { origin: "instagram", entry: "bio" });
    await add("a", a1, 47, "card_open", { path: "/spell/palla-di-fuoco" });
    await add("a", a1, 47, "favorite_add");
    await add("a", a2, 24, "page_view", { origin: "instagram" });
    await add("b", b, 48, "page_view", { origin: "instagram" });
    await add("b", b, 47, "filter_apply", { group: "livello" });
    await add("c", c, 20, "page_view", { origin: "diretto" });
    await add("c", c, 19, "search", { query: "palla di fuocco", results: 0, area: "incantesimi" });
    await add("c", c, 19, "search", { query: "palla di fuocco", results: 0, area: "incantesimi" });
    await add("c", c, 19, "search", { query: "fireballxq", results: 0, area: "globale" });
    await add("c", c, 18, "app_installed");
    await add("e", e1, 21 * 24, "page_view", { origin: "instagram" });
    await add("e", e2, 14 * 24, "page_view", { origin: "instagram" });
  });
}

test.describe.configure({ mode: "serial" });
test.afterAll(() => database(async client => {
  await client.query(`DELETE FROM grimorio_analytics_events WHERE visitor_id LIKE '${PREFIX}%'`);
  await client.query("DELETE FROM grimorio_search_synonyms WHERE query IN ('fireballxq')").catch(() => {});
  await client.query("DELETE FROM grimorio_search_todo WHERE query IN ('palla di fuocco')").catch(() => {});
}));

test("at 390: searches with no result (reason, synonym found by the public search, «Da fare»), path, Instagram, who stays", async ({ browser }) => {
  test.setTimeout(240_000);
  const { context, page } = await signIn(browser, 390);
  await openInsights(page);
  const before = await funnelNumbers(page);
  const bioBefore = await instagramPeople(page, "bio"), otherBefore = await instagramPeople(page, "altro");
  await seed();
  await openInsights(page);

  // «Il percorso»: what these people add, each step once per person; the largest drop in red.
  const after = await funnelNumbers(page);
  expect(Object.fromEntries(Object.keys(after).map(key => [key, after[key] - before[key]]))).toEqual({ arrivano: 3, scheda: 1, cercano: 2, preferito: 1, installano: 1, tornano: 1 });
  await expect(page.locator("[data-funnel-step]")).toHaveText([/^Arrivano/, /^Aprono una scheda/, /^Cercano o filtrano/, /^Salvano un preferito/, /^Installano l’app/, /^Tornano entro 7 giorni/]);
  await expect(page.locator("[data-funnel-drop]")).toHaveText(/^Il calo più grande: da .+ a .+ \(−\d+%\)$/);
  await expect(page.locator("[data-funnel-drop]")).toHaveCSS("color", "rgb(122, 31, 43)");

  // «Da Instagram»: a from the bio, b from Instagram without it; the link to copy; the chart of the arrivals from the bio.
  expect(await instagramPeople(page, "bio")).toBe(bioBefore + 1);
  expect(await instagramPeople(page, "altro")).toBe(otherBefore + 1);
  await expect(page.locator('[data-insight-row="bio"]')).toContainText(/tornati \d+%/);
  await expect(page.locator('[data-rest-item="instagram"] [data-bio-link] code')).toHaveText("ilgrimorio.app/ig");
  await expect(page.locator('[data-rest-item="instagram"] [data-bio-long]')).toHaveText("funziona anche ilgrimorio.app/?da=bio");
  await expect(page.locator('svg[data-chart="bio"]')).toHaveAttribute("aria-label", /^Arrivi dal link in bio al giorno/);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.locator('[data-rest-item="instagram"]').getByRole("button", { name: "Copia" }).click();
  await expect(page.locator('[data-rest-item="instagram"] [data-bio-link] [role="status"]')).toHaveText("Copiato");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("ilgrimorio.app/ig");

  // «Chi resta davvero»: e, arrived three weeks ago from Instagram, back the week after, not two weeks after; four weeks
  // after has not ended yet.
  await expect(page.locator("[data-cohort]")).toHaveCount(16);
  const arrival = new Date(Date.now() - 21 * 864e5), day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(arrival);
  const monday = new Date(`${day}T12:00:00Z`); monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const row = page.locator(`[data-cohort="${monday.toISOString().slice(0, 10)}:instagram"]`);
  await expect(row.locator("td").nth(2)).toHaveText("1");
  await expect(row.locator("[data-cohort-cell]")).toHaveText(["100%", "0%", "—"]);
  // The weeks going on: «—».
  await expect(page.locator("[data-cohort]").last().locator("[data-cohort-cell]")).toHaveText(["—", "—", "—"]);

  // «Ricerche senza risultato»: counted, where they were typed, the reason when it can be told.
  const typo = page.locator('[data-insight-row="palla di fuocco"]');
  await expect(typo).toContainText("«palla di fuocco»");
  await expect(typo.locator("[data-value]")).toHaveText("× 2");
  await expect(typo).toContainText("incantesimi");
  await expect(typo.locator("[data-search-reason]")).toHaveText("errore? → Palla di fuoco");
  const fireball = page.locator('[data-insight-row="fireballxq"]');
  await expect(fireball.locator("[data-value]")).toHaveText("× 1");
  await expect(fireball).toContainText("ricerca globale");

  // «Segna come da fare»: in the list «Da fare», then cancelled.
  await typo.getByRole("button", { name: "Segna come da fare" }).click();
  await expect(page.locator('[data-todo-row="palla di fuocco"]')).toBeVisible();
  await expect(typo.getByRole("button", { name: "Segna come da fare" })).toHaveCount(0);
  await page.getByRole("button", { name: "Cancella «palla di fuocco» da fare" }).click();
  await expect(page.locator('[data-todo-row="palla di fuocco"]')).toHaveCount(0);
  await expect(page.locator("[data-todo]")).toHaveText("Niente da fare.");

  // «Aggiungi sinonimo»: «fireballxq» → Palla di fuoco; the search of the Home finds it.
  await fireball.locator("summary", { hasText: "Aggiungi sinonimo" }).click();
  await fireball.getByRole("combobox", { name: "Scheda per «fireballxq»" }).fill("Palla di fuoco");
  await fireball.getByRole("button", { name: "Collega" }).click();
  await expect(page.locator('[data-insight-row="fireballxq"] [data-synonym-of="/spell/palla-di-fuoco"]')).toHaveText("sinonimo di Palla di fuoco");
  await expect(page.locator('[data-synonym-row="fireballxq"]')).toContainText("«fireballxq» → Palla di fuoco");
  const visitor = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 } });
  await visitor.addInitScript(() => { try { localStorage.setItem("grimorio.edizione", "2024"); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
  const pub = await visitor.newPage();
  await expect.poll(async () => JSON.stringify((await (await visitor.request.get("/ricerca-indice.json")).json()).syn ?? [])).toContain("fireballxq");
  await pub.goto("/");
  await pub.getByRole("button", { name: "Cerca nel Grimorio 2024…" }).click();
  const dialog = pub.getByRole("dialog", { name: "Cerca in tutto il Grimorio" });
  await dialog.getByRole("searchbox").fill("fireballxq");
  await expect(dialog.locator('a[href="/spell/palla-di-fuoco"]')).toBeVisible();
  await expect(dialog.locator('a[href="/spell/palla-di-fuoco"]')).toContainText("Palla di fuoco");
  await visitor.close();
  // Taken away: the index no longer has it.
  await page.getByRole("button", { name: "Togli il sinonimo «fireballxq»" }).click();
  await expect(page.locator('[data-synonym-row="fireballxq"]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  if (process.env.STATISTICHE_SHOTS) await page.locator("[data-insights]").screenshot({ path: `${process.env.STATISTICHE_SHOTS}/approfondimenti-390.png` });
  await context.close();
});

test("at 1280: the four cards under the tiles, before «Il resto», numbers on the right, no side scroll; only for the administrator", async ({ browser, request }) => {
  test.setTimeout(120_000);
  const { context, page } = await signIn(browser, 1280);
  await openInsights(page);
  const top = async selector => (await page.locator(selector).first().boundingBox()).y;
  expect(await top("[data-insights]")).toBeGreaterThan(await top("[data-tiles]"));
  expect(await top("[data-rest]")).toBeGreaterThan(await top("[data-insights]"));
  await expect(page.locator("[data-insights] > details")).toHaveCount(7);
  await expect(page.locator('[data-rest-item="ricerche"] > summary')).toHaveCSS("text-transform", "uppercase");
  await expect(page.locator('[data-rest-item="ricerche"] > summary')).toHaveCSS("color", "rgb(122, 31, 43)");
  // The number of a row on the right of its label.
  const label = await page.locator('[data-insight-row="bio"] span > span').first().boundingBox(), value = await page.locator('[data-insight-row="bio"] [data-value]').boundingBox();
  expect(value.x).toBeGreaterThan(label.x + label.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
  if (process.env.STATISTICHE_SHOTS) await page.locator("[data-insights]").screenshot({ path: `${process.env.STATISTICHE_SHOTS}/approfondimenti-1280.png` });
  await context.close();
  // Not the administrator: the passcode, nothing of the insights in the page.
  const html = await (await request.get("/admin/statistiche?periodo=7")).text();
  expect(html).not.toMatch(/data-insights|Ricerche senza risultato|palla di fuocco/);
});
