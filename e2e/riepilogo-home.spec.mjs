import { test, expect } from "./fixtures.mjs";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";

// The strip of the Home for the administrator (PROMPT 18): «adesso», people, «tornano», «usano l’app», from
// /api/admin/riepilogo after the session check. Visitors: no strip, no request, the same Home. Local test database only.
const SHOTS = process.env.RIEPILOGO_SHOTS;
const PREFIX = "prova-riepilogo-";

async function login(page) {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
}

async function database(run) {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try { return await run(client); } finally { await client.end(); }
}

/** A page view of a visitor, minutes ago (0: now), with or without the installed app. */
const view = (visitor, minutesAgo, installed = false, session = randomUUID()) => database(client => client.query(
  `INSERT INTO grimorio_analytics_events (id, visitor_id, session_id, view_id, event_name, path, source, is_test, origin, device, installed, exported, received_at)
   VALUES ($1, $2, $3, $4, 'page_view', '/', 'direct', false, 'diretto', 'iphone', $5, true, now() - make_interval(mins => $6))`,
  [randomUUID(), `${PREFIX}${visitor}`, session, randomUUID(), installed, minutesAgo]));

test.beforeAll(async () => {
  // The tables exist after the first event of any spec; here they may not yet.
  await database(client => client.query("SELECT 1 FROM grimorio_analytics_events LIMIT 1")).catch(() => null);
});
test.afterAll(async () => {
  await database(client => client.query("DELETE FROM grimorio_analytics_events WHERE visitor_id LIKE $1", [`${PREFIX}%`]));
});

const tileValue = async (page, name) => (await page.locator(`[data-tile="${name}"] [data-tile-value]`).textContent()).trim();

for (const width of [390, 1280]) {
  test(`administrator (${width}): the strip under the header, the numbers of the 30 days, a tap opens the statistics, «adesso» follows`, async ({ browser }) => {
    test.setTimeout(150_000);
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await context.addInitScript(() => { try { localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); localStorage.setItem("grimorio.edizione", "2024"); } catch { /* no storage */ } });
    const page = await context.newPage();
    await login(page);
    // Three people: «a» now with the app, «b» twice in two visits (it comes back), «c» an hour ago.
    await page.goto("/admin/statistiche");
    const tag = `${width}-`;
    await view(`${tag}a`, 0, true);
    await view(`${tag}b`, 2000);
    await view(`${tag}b`, 1);
    await view(`${tag}c`, 60);
    // The numbers of the tiles of /admin/statistiche on 30 days, and «adesso» under the title.
    await page.goto("/admin/statistiche?periodo=30");
    const expected = { persone: await tileValue(page, "persone"), tornano: await tileValue(page, "tornano"), app: await tileValue(page, "app") };
    const nowOnStats = Number(await page.locator("[data-now]").getAttribute("data-now"));
    expect(nowOnStats).toBeGreaterThanOrEqual(2);
    await expect(page.locator("[data-now]")).toHaveText(`${nowOnStats} persone adesso`);

    const asked = [];
    page.on("request", request => { if (new URL(request.url()).pathname === "/api/admin/riepilogo") asked.push(request.url()); });
    await page.goto("/");
    const strip = page.locator("[data-admin-strip]");
    await expect(strip).toHaveAttribute("data-admin-strip", "ready");
    const item = key => strip.locator(`[data-strip-item="${key}"] b`);
    // The text as drawn (the hidden label of the other width left out).
    const shown = key => strip.locator(`[data-strip-item="${key}"]`).evaluate(el => el.innerText.replace(/\s+/g, " ").trim());
    await expect(item("persone")).toHaveText(expected.persone);
    await expect(item("tornano")).toHaveText(expected.tornano);
    await expect(item("app")).toHaveText(expected.app);
    await expect(item("adesso")).toHaveText(String(nowOnStats));
    await expect(strip).toHaveAttribute("aria-label", new RegExp(`^Statistiche: ${nowOnStats} persone adesso, ${expected.persone} (?:persona|persone) negli ultimi 30 giorni, il ${expected.tornano.replace("%", "")} per cento tornano, ${expected.app} usano l’app\\. Apri le statistiche\\.$`));
    // Style: margins 12 on the phone, 44 high, radius 12, dark; serif numbers of 20 px; the green of the app.
    await expect(strip).toHaveCSS("background-color", "rgb(43, 33, 24)");
    await expect(strip).toHaveCSS("border-top-left-radius", "12px");
    await expect(item("persone")).toHaveCSS("font-size", "20px");
    await expect(item("app")).toHaveCSS("color", "rgb(156, 211, 180)");
    const box = await strip.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    if (width < 1024) {
      expect(box.x).toBe(12);
      // Under the header, above the picture of the library.
      expect(box.y).toBeGreaterThan((await page.locator("header").first().boundingBox()).y);
      expect(box.y + box.height).toBeLessThanOrEqual((await page.locator("#home-quote").locator("xpath=ancestor::section").boundingBox()).y);
      // Short labels, one line, no side scroll.
      await expect.poll(() => shown("adesso")).toBe(`${nowOnStats} ora`);
      await expect.poll(() => shown("app")).toBe(`${expected.app} app`);
    } else {
      await expect.poll(() => shown("adesso")).toBe(`${nowOnStats} adesso`);
      await expect.poll(() => shown("app")).toBe(`${expected.app} usano l’app`);
    }
    const tops = await strip.locator("[data-strip-item]").evaluateAll(items => items.map(el => [el.getBoundingClientRect().top, el.getBoundingClientRect().height]));
    expect(new Set(tops.map(([top]) => Math.round(top))).size).toBe(1);
    expect(tops.every(([, height]) => height < 30)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    // «Riduci movimento»: the dot does not pulse.
    await expect(strip.locator('[data-strip-item="adesso"] > span').first()).toHaveCSS("animation-name", "none");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/home-admin-${width}.png` });
    expect(asked).toHaveLength(1);

    // A new person now: «adesso» goes up by itself within 30 seconds.
    await view(`${tag}d`, 0);
    await expect(item("adesso")).toHaveText(String(nowOnStats + 1), { timeout: 40_000 });
    expect(asked.some(url => url.endsWith("?adesso=1"))).toBe(true);
    // Hidden tab: no more asking.
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    const before = asked.length;
    await page.waitForTimeout(32_000);
    expect(asked.length).toBe(before);

    await strip.click();
    await expect(page).toHaveURL(/\/admin\/statistiche$/);
    await context.close();
  });
}

test("administrator: while the numbers come, dashes in the same place; a failed answer, no strip", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => { try { localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); localStorage.setItem("grimorio.edizione", "2024"); } catch { /* no storage */ } });
  const page = await context.newPage();
  await login(page);
  let release;
  const held = new Promise(resolve => { release = resolve; });
  await page.route("**/api/admin/riepilogo*", async route => { await held; await route.continue(); });
  await page.goto("/");
  const strip = page.locator("[data-admin-strip]");
  await expect(strip).toHaveAttribute("data-admin-strip", "loading");
  await expect(strip.locator("[data-strip-item] b")).toHaveText(["—", "—", "—", "—"]);
  const waiting = await strip.boundingBox();
  const picture = await page.locator("#home-quote").locator("xpath=ancestor::section").boundingBox();
  release();
  await expect(strip).toHaveAttribute("data-admin-strip", "ready");
  expect(Math.round((await strip.boundingBox()).height)).toBe(Math.round(waiting.height));
  expect(Math.round((await page.locator("#home-quote").locator("xpath=ancestor::section").boundingBox()).y)).toBe(Math.round(picture.y));
  await page.unroute("**/api/admin/riepilogo*");
  await page.route("**/api/admin/riepilogo*", route => route.fulfill({ status: 500, body: "{}" }));
  await page.reload();
  await expect(page.locator("#home-quote")).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(page.locator("[data-admin-strip]")).toHaveCount(0);
  await context.close();
});

test("visitor: no strip, no request for the numbers, nothing of it in the Home HTML; 401 without the session", async ({ browser, request }) => {
  for (const width of [390, 1280]) {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: 900 } });
    await context.addInitScript(() => { try { localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); localStorage.setItem("grimorio.edizione", "2024"); } catch { /* no storage */ } });
    const page = await context.newPage();
    const asked = [];
    page.on("request", item => { if (new URL(item.url()).pathname.startsWith("/api/admin/")) asked.push(item.url()); });
    await page.goto("/");
    await expect(page.locator("#home-quote")).toBeVisible();
    await page.waitForTimeout(2000);
    await expect(page.locator("[data-admin-strip]")).toHaveCount(0);
    expect(asked, String(width)).toEqual([]);
    await context.close();
  }
  const denied = await request.get("/api/admin/riepilogo");
  expect(denied.status()).toBe(401);
  expect(denied.headers()["cache-control"]).toBe("private, no-store");
  expect((await request.get("/api/admin/riepilogo?adesso=1")).status()).toBe(401);
  // The Home HTML: nothing of the strip, for a visitor and for the administrator too (the browser draws it).
  const visitorHtml = await (await request.get("/")).text();
  expect(visitorHtml).not.toContain("data-admin-strip");
  expect(visitorHtml).not.toMatch(/persone adesso|usano l’app|tornano/);
  const adminContext = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const admin = await adminContext.newPage();
  await login(admin);
  expect(await (await admin.request.get("/")).text()).not.toContain("data-admin-strip");
  await adminContext.close();
  // The service worker script carries none of it.
  expect(await (await request.get("/sw.js")).text()).not.toContain("riepilogo");
});
