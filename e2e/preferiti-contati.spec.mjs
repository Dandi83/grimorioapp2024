import { test, expect } from "@playwright/test";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";

// «I più salvati» (PROMPT 10): a visitor taps the star, the server counts the person (on http://localhost only,
// the host where e2e/run.mjs turns the statistics on); the administrator sees the card in «I più salvati» and «★ 1»
// in the list. Local test database only.
const SHOTS = process.env.PREFERITI_SHOTS;

async function clean() {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try {
    await client.query("DELETE FROM grimorio_favorite_saves").catch(() => {});
    // Every event of the browsers of this test (their page views too): the other tests count people.
    await client.query("DELETE FROM grimorio_analytics_events WHERE visitor_id IN (SELECT visitor_id FROM grimorio_analytics_events WHERE event_name IN ('favorite_add','favorite_remove'))").catch(() => {});
  } finally {
    await client.end();
  }
}

async function visitor(browser) {
  const base = new URL(test.info().project.use.baseURL);
  base.hostname = "localhost";
  const context = await browser.newContext({ baseURL: base.origin, viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => {
    try {
      localStorage.setItem("grimorio.edizione", "2024");
      localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5));
    } catch { /* no storage */ }
  });
  return context;
}

/** A page of the visitor, once the statistics are on for it (its page view saved): a star before would not be sent. */
async function open(page, path) {
  const viewed = page.waitForResponse(response => response.url().endsWith("/api/analytics") && response.request().method() === "POST"
    && response.request().postData()?.includes('"event":"page_view"'));
  await page.goto(path);
  // The statistics send with keepalive: the browser gives no body to read, the status is enough.
  expect((await viewed).status()).toBe(200);
}

/** The star tapped and its event saved by the server (counted by default, until «No»). */
async function tapStar(page, star, event) {
  const saved = page.waitForResponse(response => response.url().endsWith("/api/analytics") && response.request().method() === "POST"
    && response.request().postData()?.includes(`"event":"${event}"`));
  await star.click();
  expect((await saved).status()).toBe(200);
}

async function login(page) {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
}

test("a star on a card and in a list: the card in «I più salvati» and «★ 1» in the admin list; removed, it goes", async ({ browser, page }) => {
  test.setTimeout(180_000);
  await clean();
  const context = await visitor(browser);
  const guest = await context.newPage();
  // From the card of a spell (the star of the sheet).
  await open(guest, "/spell/palla-di-fuoco");
  await tapStar(guest, guest.getByRole("button", { name: "Aggiungi ai preferiti" }), "favorite_add");
  // A second tap and a third one: removed and saved again, still one person.
  await tapStar(guest, guest.getByRole("button", { name: "Rimuovi dai preferiti" }), "favorite_remove");
  await tapStar(guest, guest.getByRole("button", { name: "Aggiungi ai preferiti" }), "favorite_add");
  // From the list of the Bestiario.
  await open(guest, "/bestiario");
  await guest.getByRole("searchbox", { name: "Cerca una creatura" }).fill("goblin");
  const row = guest.locator("main li").filter({ has: guest.locator('a[href^="/mostro/goblin"]') }).first();
  const monsterHref = await row.locator('a[href^="/mostro/goblin"]').first().getAttribute("href");
  await tapStar(guest, row.getByRole("button", { name: "Aggiungi ai preferiti" }), "favorite_add");
  const monsterId = monsterHref.split("/").pop();

  // The administrator: «I più salvati» and the lists.
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.goto("/admin/statistiche");
  // «Il resto» (PROMPT 16): the item opened with a tap.
  await page.locator('[data-rest-item="salvati"] > summary').click();
  const block = page.locator("[data-most-saved]");
  await expect(page.locator('[data-rest-item="salvati"] > summary')).toHaveText(/^I più salvati/);
  await expect(block.locator('[data-saved-card="incantesimo:palla-di-fuoco"] [data-saved-people]')).toHaveText("1");
  await expect(block.locator(`[data-saved-card="mostro:${monsterId}"] [data-saved-people]`)).toHaveText("1");
  await expect(block.locator("[data-saves-note]")).toHaveText("Conteggio dal 28 ottobre 2026: i preferiti salvati prima non sono noti.");
  await block.scrollIntoViewIfNeeded();
  if (SHOTS) await block.screenshot({ path: `${SHOTS}/1-piu-salvati.png` });
  // Filters: kind, edition, period.
  await block.locator('[data-saved-filter="salvati_tipo:mostro"]').click();
  await expect(page).toHaveURL(/salvati_tipo=mostro/);
  await expect(block.locator("[data-saved-card]")).toHaveCount(1);
  await expect(block.locator(`[data-saved-card="mostro:${monsterId}"]`)).toBeVisible();
  await block.locator('[data-saved-filter="salvati_edizione:2014"]').click();
  await expect(page).toHaveURL(/salvati_edizione=2014/);
  await expect(block.locator("[data-saved-card]")).toHaveCount(0);
  await expect(block).toContainText("Nessuna scheda salvata con questi filtri.");
  await block.locator('[data-saved-filter="salvati_tipo:tutti"]').click();
  await expect(page).toHaveURL(/salvati_tipo=tutti/);
  await block.locator('[data-saved-filter="salvati_edizione:2024"]').click();
  await expect(page).toHaveURL(/salvati_edizione=2024/);
  await block.locator('[data-saved-filter="salvati_periodo:30"]').click();
  await expect(page).toHaveURL(/salvati_tipo=tutti&salvati_edizione=2024&salvati_periodo=30/);
  await expect(block.locator("[data-saved-card]")).toHaveCount(2);

  await page.goto("/admin/edizione?valore=2024&poi=%2Fadmin%2Fincantesimi");
  await page.getByRole("searchbox", { name: "Cerca in Incantesimi" }).fill("palla di fuoco");
  const adminRow = page.locator('main li[data-card-row="palla-di-fuoco"]');
  await expect(adminRow.locator("[data-saves]")).toHaveText("1");
  await expect(adminRow.locator("[data-saves]")).toHaveAttribute("aria-label", "Nei preferiti di 1 persona");
  await expect(adminRow.locator("[data-saves] svg")).toHaveCount(1);
  await expect(page.locator("[data-saves-note]")).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/2-lista-admin.png` });
  // A card nobody saved: nothing next to it.
  await page.getByRole("searchbox", { name: "Cerca in Incantesimi" }).fill("dardo incantato");
  await expect(page.locator('main li[data-card-row^="dardo-incantato"] [data-saves]')).toHaveCount(0);
  await page.goto("/admin/edizione?valore=2024&poi=%2Fadmin%2Fmostri");
  await page.getByRole("searchbox", { name: "Cerca in Mostri" }).fill("goblin");
  await expect(page.locator(`main li[data-card-row="${monsterId}"] [data-saves]`)).toHaveText("1");

  // The visitor removes the star: the card leaves «I più salvati».
  await open(guest, "/spell/palla-di-fuoco");
  await tapStar(guest, guest.getByRole("button", { name: "Rimuovi dai preferiti" }), "favorite_remove");
  await page.goto("/admin/statistiche");
  await expect(page.locator('[data-saved-card="incantesimo:palla-di-fuoco"]')).toHaveCount(0);
  // The administrator's own stars never count (device excluded at the login).
  await page.goto("/spell/dardo-incantato");
  await page.getByRole("button", { name: "Aggiungi ai preferiti" }).click();
  await page.goto("/admin/statistiche");
  await expect(page.locator('[data-saved-card="incantesimo:dardo-incantato"]')).toHaveCount(0);
  // Nothing of it in the public pages.
  const html = await (await guest.request.get("/grimorio")).text();
  expect(html).not.toMatch(/data-saves|I più salvati/);
  await context.close();
  await clean();
});

test("«No» to the statistics: the star is never sent and the earlier stars stop counting", async ({ browser, page }) => {
  test.setTimeout(120_000);
  await clean();
  const context = await visitor(browser);
  const guest = await context.newPage();
  await open(guest, "/spell/palla-di-fuoco");
  await tapStar(guest, guest.getByRole("button", { name: "Aggiungi ai preferiti" }), "favorite_add");
  // «No» on the bar of the statistics.
  await guest.locator("[data-statistics-bar]").getByRole("button", { name: "No" }).click();
  await expect(guest.locator("[data-statistics-bar]")).toHaveCount(0);
  const sent = [];
  guest.on("request", request => { if (request.url().endsWith("/api/analytics") && request.method() === "POST") sent.push(request.postData()); });
  await guest.goto("/spell/dardo-incantato");
  await guest.getByRole("button", { name: "Aggiungi ai preferiti" }).click();
  await guest.waitForTimeout(800);
  expect(sent.filter(body => body?.includes("favorite_"))).toEqual([]);
  await login(page);
  await page.goto("/admin/statistiche");
  await expect(page.locator("[data-most-saved] [data-saved-card]")).toHaveCount(0);
  await context.close();
  await clean();
});
