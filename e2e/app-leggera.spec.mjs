import { spawn } from "node:child_process";
import { test, expect } from "@playwright/test";

// «App più leggera» (PROMPT 43): Preferiti without the whole catalog (only the saved cards, from /preferiti/schede,
// and the copy kept on the device for offline), the service worker that keeps /preferiti out of its first copy and
// saves the lists only when the browser is idle, the invite to install that comes with the first gesture.

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const SAVED = ["palla-di-fuoco", "palla-di-fuoco-2014", "mostro:aboleth", "mostro:orco-2014"];

/** A visitor with the edition chosen, the statistics bar answered and, unless invite, the invite closed. */
async function visitor(browser, { edition = "2024", favorites = null, invite = false, phone = false, baseURL } = {}) {
  const context = await browser.newContext({
    baseURL: baseURL ?? test.info().project.use.baseURL,
    ...(phone ? { viewport: { width: 390, height: 844 }, userAgent: IPHONE, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 900 } }),
  });
  await context.addInitScript(({ edition, favorites, invite }) => {
    try {
      if (!localStorage.getItem("grimorio.edizione")) localStorage.setItem("grimorio.edizione", edition);
      if (favorites && !sessionStorage.getItem("p43-seeded")) { localStorage.setItem("grimorio.favorites.v1", JSON.stringify(favorites)); sessionStorage.setItem("p43-seeded", "1"); }
      if (!invite) localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5));
    } catch { /* no storage */ }
  }, { edition, favorites, invite });
  // /api/analytics as on ilgrimorio.app with the bar already answered «Ok»: the invite is free to show.
  await context.route("**/api/analytics", route => route.request().method() === "GET"
    ? route.fulfill({ json: { enabled: true, excluded: false, consent: "accepted" } })
    : route.fulfill({ json: { ok: true, stored: true } }));
  const page = await context.newPage();
  const asked = [];
  page.on("request", request => { if (new URL(request.url()).pathname === "/preferiti/schede") asked.push(request.url()); });
  return { context, page, asked };
}

/** A tap on the title of the Home: plain text, nothing opens. */
async function tapHeading(page) {
  const box = await page.getByRole("heading", { level: 1 }).boundingBox();
  await page.touchscreen.tap(box.x + 10, box.y + box.height / 2);
}

const rows = page => ({
  spells: page.getByRole("region", { name: "Incantesimi preferiti" }).locator("li"),
  monsters: page.getByRole("region", { name: "Mostri preferiti" }).locator("li"),
});

test("Preferiti empty: the same message, no card asked, no catalog in the page", async ({ browser }) => {
  const { context, page, asked } = await visitor(browser, { favorites: [] });
  const response = await page.goto("/preferiti");
  await expect(page.getByText("Nessun preferito salvato.")).toBeVisible();
  await expect(page.getByText("Aggiungi incantesimi e mostri ai preferiti per ritrovarli qui.")).toBeVisible();
  await page.waitForTimeout(1000);
  expect(asked).toEqual([]);
  // The page itself carries no list of spells or creatures any more.
  const html = await response.text();
  expect(html).not.toContain("Palla di Fuoco");
  expect(html).not.toContain("Aboleth");
  expect(html.length).toBeLessThan(120_000);
  await context.close();
});

for (const edition of ["2024", "2014"]) {
  test(`Preferiti with saved cards of 2024 and 2014, edition ${edition}: only those asked, again after a reload`, async ({ browser }) => {
    const { context, page, asked } = await visitor(browser, { edition, favorites: SAVED });
    await page.goto("/preferiti");
    const { spells, monsters } = rows(page);
    await expect(spells).toHaveCount(2);
    await expect(monsters).toHaveCount(2);
    await expect(page.getByText("2 incantesimi salvati · 2 mostri salvati")).toBeVisible();
    await expect(page.locator('main a[href="/spell/palla-di-fuoco"]')).toHaveCount(1);
    await expect(page.locator('main a[href="/spell/palla-di-fuoco-2014"]')).toHaveCount(1);
    await expect(page.locator('main a[href="/mostro/aboleth"]')).toHaveCount(1);
    await expect(page.locator('main a[href="/mostro/orco-2014"]')).toHaveCount(1);
    // One request, with the four ids only.
    expect(asked).toHaveLength(1);
    const params = new URL(asked[0]).searchParams;
    expect(params.get("s")).toBe("palla-di-fuoco,palla-di-fuoco-2014");
    expect(params.get("m")).toBe("aboleth,orco-2014");
    // The answer: four rows, no sheet.
    const answer = await (await page.request.get(asked[0])).json();
    expect(answer.spells.map(spell => spell.id).sort()).toEqual(["palla-di-fuoco", "palla-di-fuoco-2014"]);
    expect(answer.monsters.map(monster => monster.id).sort()).toEqual(["aboleth", "orco-2014"]);
    expect(answer.monsters.some(monster => "azioni" in monster || "descrizione" in monster)).toBe(false);
    // After a reload: the same rows; removing one leaves the others.
    await page.reload();
    await expect(spells).toHaveCount(2);
    await expect(monsters).toHaveCount(2);
    await page.getByRole("region", { name: "Mostri preferiti" }).getByRole("button", { name: "Rimuovi dai preferiti" }).first().click();
    await expect(monsters).toHaveCount(1);
    await expect(spells).toHaveCount(2);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("grimorio.favorites.v1")).length)).toBe(3);
    await context.close();
  });
}

test("Preferiti: favorites saved before this change keep working, nothing in the list is rewritten", async ({ browser }) => {
  const { context, page } = await visitor(browser, { favorites: ["dardo-incantato", "mostro:aboleth"] });
  await page.goto("/preferiti");
  await expect(rows(page).spells).toHaveCount(1);
  await expect(rows(page).monsters).toHaveCount(1);
  expect(await page.evaluate(() => localStorage.getItem("grimorio.favorites.v1"))).toBe(JSON.stringify(["dardo-incantato", "mostro:aboleth"]));
  await context.close();
});

test("Install invite: absent at load, shown at the first scroll or tap, never when closed or installed", async ({ browser }) => {
  const shown = await visitor(browser, { invite: true, phone: true });
  // A long page, to scroll (the Home fits the phone: there the first gesture is a tap, below).
  await shown.page.goto("/grimorio");
  await shown.page.waitForTimeout(3000);
  await expect(shown.page.locator("[data-install-prompt]")).toHaveCount(0);
  await shown.page.evaluate(() => window.scrollBy(0, 80));
  await expect(shown.page.locator("[data-install-prompt]")).toBeVisible();
  await expect(shown.page.locator("[data-install-prompt]")).toContainText("Aggiungi Il Grimorio.App");
  // The same card, fixed above the page: nothing moved.
  const cls = await shown.page.evaluate(() => new Promise(resolve => {
    let total = 0;
    new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) total += entry.value; }).observe({ type: "layout-shift", buffered: true });
    setTimeout(() => resolve(total), 500);
  }));
  expect(cls).toBe(0);
  await shown.context.close();

  const tap = await visitor(browser, { invite: true, phone: true });
  await tap.page.goto("/");
  await tap.page.waitForTimeout(1000);
  await expect(tap.page.locator("[data-install-prompt]")).toHaveCount(0);
  await tapHeading(tap.page);
  await expect(tap.page.locator("[data-install-prompt]")).toBeVisible();
  await tap.page.locator("[data-install-prompt]").getByRole("button", { name: "Chiudi" }).click();
  await expect(tap.page.locator("[data-install-prompt]")).toHaveCount(0);
  await tap.page.reload();
  await tapHeading(tap.page);
  await tap.page.waitForTimeout(1500);
  await expect(tap.page.locator("[data-install-prompt]")).toHaveCount(0);
  await tap.context.close();

  const installed = await visitor(browser, { invite: true, phone: true });
  await installed.context.addInitScript(() => Object.defineProperty(navigator, "standalone", { get: () => true }));
  await installed.page.goto("/");
  await tapHeading(installed.page);
  await installed.page.waitForTimeout(1500);
  await expect(installed.page.locator("[data-install-prompt]")).toHaveCount(0);
  await installed.context.close();
});

// A dedicated server that the test really switches off (the browser's offline emulation does not reach the service worker).
const port = 3210;
const base = `http://127.0.0.1:${port}`;
let server;
async function startServer() {
  server = spawn("npx", ["next", "start", "-p", String(port), "-H", "127.0.0.1"], { stdio: "ignore", env: process.env, detached: true });
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(base + "/")).ok) return; } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error("server did not start");
}
async function stopServer() {
  if (!server) return;
  const stopping = server;
  server = undefined;
  const exited = new Promise(resolve => stopping.once("exit", resolve));
  try { process.kill(-stopping.pid, "SIGKILL"); } catch { /* already stopped */ }
  if (stopping.exitCode === null && stopping.signalCode === null) await exited;
}
test.afterEach(stopServer);

const cachedPaths = page => page.evaluate(async () => {
  const paths = [];
  for (const key of await caches.keys()) {
    if (!key.startsWith("grimorio-pages-")) continue;
    for (const request of await (await caches.open(key)).keys()) paths.push(new URL(request.url).pathname);
  }
  return paths.sort();
});

test("Service worker: /preferiti never in the first copy, the lists saved when idle; Preferiti offline after a visit", async ({ browser }) => {
  test.setTimeout(120_000);
  await startServer();
  const { context, page } = await visitor(browser, { favorites: SAVED, baseURL: base });
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  // At install: the Home only. Then, when the browser is idle, the lists and the search index; never Preferiti.
  await expect.poll(() => cachedPaths(page), { timeout: 20_000 }).toEqual(expect.arrayContaining(["/", "/bestiario", "/compendio", "/grimorio", "/ricerca-indice.json"]));
  expect(await cachedPaths(page)).not.toContain("/preferiti");
  // A visit to Preferiti with the connection: the page and its cards are kept.
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.goto(base + "/preferiti");
  await expect(rows(page).spells).toHaveCount(2);
  await expect(rows(page).monsters).toHaveCount(2);
  // Airplane mode: the same list, from the copy on the device.
  await stopServer();
  await page.reload();
  await expect(page.getByRole("status").filter({ hasText: "Sei offline" })).toBeVisible();
  await expect(rows(page).spells).toHaveCount(2);
  await expect(rows(page).monsters).toHaveCount(2);
  await expect(page.locator('main a[href="/mostro/orco-2014"]')).toHaveCount(1);
  await context.close();
});
