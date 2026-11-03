import { test, expect, devices } from "./fixtures.mjs";

// PROMPT 58: after the Home, the data of Incantesimi and Bestiario is downloaded once each. In a browser tab only the
// bottom bar's prefetch (the router), for the instant navigation; in the installed app the service worker also saves the
// page for the offline use, once per version of the site (a second launch downloads only the router's data).
// «Data» is the content of the page: the router's page segment («__PAGE__») or the HTML of the page. The route tree
// («/_tree», about 1 KB, no list in it) is counted apart.
const PHONE = { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } };
delete PHONE.defaultBrowserType;
const LISTS = ["/grimorio", "/bestiario"];

async function watch(context) {
  const seen = [];
  context.on("request", request => {
    const url = new URL(request.url());
    if (!LISTS.includes(url.pathname)) return;
    const headers = request.headers();
    const segment = headers["next-router-segment-prefetch"] || "";
    const kind = request.serviceWorker() ? "worker" : headers.rsc ? (segment === "/_tree" ? "tree" : "router") : "page";
    seen.push({ path: url.pathname, kind, segment });
  });
  return seen;
}
const data = (seen, path) => seen.filter(item => item.path === path && item.kind !== "tree");

async function home(browser, installed) {
  const context = await browser.newContext({ ...PHONE, baseURL: test.info().project.use.baseURL });
  await context.addInitScript(() => { try { localStorage.setItem("grimorio.edizione", "2024"); localStorage.setItem("grimorio.statistiche", "no"); } catch { /* no storage */ } });
  if (installed) await context.addInitScript(() => {
    const query = window.matchMedia.bind(window);
    window.matchMedia = media => (/display-mode:\s*standalone/.test(media) ? { ...query("(min-width: 0px)"), media, matches: true } : query(media));
  });
  const seen = await watch(context);
  const page = await context.newPage();
  return { context, page, seen };
}
const savedLists = page => page.evaluate(async lists => {
  const found = [];
  for (const key of await caches.keys()) {
    if (!key.startsWith("grimorio-pages-")) continue;
    for (const request of await (await caches.open(key)).keys()) { const path = new URL(request.url).pathname; if (lists.includes(path)) found.push(path); }
  }
  return found.sort();
}, LISTS);

test("browser tab: after the Home, Incantesimi and Bestiario are downloaded once each (the router), never by the worker", async ({ browser }) => {
  test.setTimeout(90_000);
  const { context, page, seen } = await home(browser, false);
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  // The worker's «warm» comes when the browser is idle (at most 10 s), the router's prefetch too.
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).length), { timeout: 20_000 }).toBeGreaterThan(0);
  await expect.poll(() => data(seen, "/grimorio").length, { timeout: 20_000 }).toBe(1);
  await expect.poll(() => data(seen, "/bestiario").length, { timeout: 20_000 }).toBe(1);
  await page.waitForTimeout(12_000);
  for (const path of LISTS) {
    expect(data(seen, path), path).toEqual([expect.objectContaining({ kind: "router", segment: `${path}/__PAGE__` })]);
  }
  expect(await savedLists(page)).toEqual([]);
  // The navigation from the bottom bar uses that data: no other request for the list.
  await page.locator("[data-bottom-nav] a[href='/grimorio']").click();
  await expect(page.locator(".catalog-row").first()).toBeVisible();
  await page.waitForTimeout(500);
  expect(data(seen, "/grimorio")).toHaveLength(1);
  await context.close();
});

test("installed app: the lists saved for the offline use once per version; the next launch downloads only the router's data", async ({ browser }) => {
  test.setTimeout(120_000);
  const { context, page, seen } = await home(browser, true);
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => savedLists(page), { timeout: 25_000 }).toEqual(LISTS.slice().sort());
  await page.waitForTimeout(3000);
  for (const path of LISTS) {
    expect(data(seen, path).filter(item => item.kind === "worker"), `${path} saved once`).toHaveLength(1);
    expect(data(seen, path).filter(item => item.kind === "router"), `${path} prefetched once`).toHaveLength(1);
  }
  // A second launch of the app: the copies are there, the worker does not download them again.
  seen.length = 0;
  await page.reload();
  await page.waitForTimeout(14_000);
  for (const path of LISTS) {
    expect(data(seen, path).filter(item => item.kind === "worker"), `${path}: no second copy`).toHaveLength(0);
    expect(data(seen, path).length, `${path}: at most one download`).toBeLessThanOrEqual(1);
  }
  await context.close();
});
