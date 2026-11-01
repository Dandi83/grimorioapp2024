import { test, expect } from "./fixtures.mjs";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";

// PROMPT 34: the short link of the Instagram bio. /ig and /IG answer 307 (not permanent, not kept by the browser, not
// indexed) to /?da=bio; the Home reads the mark, counts the arrival as «Link in bio» (statistics on for
// http://localhost only, local test database) and leaves the address clean without a new page. /?da=bio as before.
async function database(run) {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try { return await run(client); } finally { await client.end(); }
}
const bioViews = since => database(async client => (await client.query(
  "SELECT count(*)::int AS n FROM grimorio_analytics_events WHERE event_name='page_view' AND entry='bio' AND received_at >= $1", [since])).rows[0].n)
  .catch(() => 0);

async function visitor(browser, width) {
  const base = new URL(test.info().project.use.baseURL);
  base.hostname = "localhost";
  const context = await browser.newContext({ baseURL: base.origin, viewport: { width, height: width < 600 ? 844 : 900 } });
  await context.addInitScript(() => {
    try {
      localStorage.setItem("grimorio.edizione", "2024");
      localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5));
    } catch { /* no storage */ }
  });
  return context;
}

test("the answer of /ig and /IG: 307 to /?da=bio, no-store, noindex; no sitemap lists it", async ({ request }) => {
  for (const path of ["/ig", "/IG"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(307);
    expect(response.headers().location).toBe("/?da=bio");
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
  }
  // The site has no sitemap; if one appears, /ig stays out of it. robots.txt the same.
  for (const file of ["/sitemap.xml", "/robots.txt"]) {
    const response = await request.get(file);
    if (response.ok()) expect(await response.text()).not.toMatch(/\/ig\b/i);
  }
  // The preview of the link (Open Graph) is the one of the Home: the crawler follows the redirect to it.
  const home = await (await request.get("/")).text();
  const followed = await (await request.get("/ig")).text();
  const og = html => html.match(/<meta property="og:(?:title|image)" content="[^"]*"/g);
  expect(og(followed)).toEqual(og(home));
  expect(og(home)?.length).toBeGreaterThan(0);
});

for (const width of [390, 1280]) {
  test(`at ${width}: /ig, /IG and /?da=bio reach the Home with a clean address, counted as «Link in bio»`, async ({ browser }) => {
    test.setTimeout(120_000);
    const since = new Date();
    const context = await visitor(browser, width);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(String(error)));
    let counted = 0;
    const posted = [];
    page.on("request", request => { if (request.url().endsWith("/api/analytics") && request.method() === "POST") posted.push(JSON.parse(request.postData() || "{}")); });
    for (const path of ["/ig", "/IG", "/?da=bio"]) {
      const calls = [];
      const onRequest = request => { if (["fetch", "xhr"].includes(request.resourceType())) calls.push(`${request.method()} ${new URL(request.url()).pathname}`); };
      page.on("request", onRequest);
      const viewed = page.waitForResponse(response => response.url().endsWith("/api/analytics") && response.request().method() === "POST"
        && response.request().postData()?.includes('"event":"page_view"'));
      await page.goto(path);
      const body = (await viewed).request().postData();
      expect(JSON.parse(body)).toMatchObject({ event: "page_view", bio: true });
      expect((await viewed).status()).toBe(200);
      // The address stays the Home with no parameter, in the same document (no reload).
      await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);
      expect(await page.evaluate(() => performance.getEntriesByType("navigation").length)).toBe(1);
      await expect(page.locator("main")).toBeVisible();
      counted++;
      await expect.poll(() => bioViews(since), { timeout: 10_000, message: JSON.stringify(posted.map(event => [event.event, event.path, event.bio])) }).toBe(counted);
      await page.waitForTimeout(500);
      page.off("request", onRequest);
      // No request more than the Home already makes: only the statistics.
      expect(calls.filter(call => call.includes(" /api/") && !call.endsWith(" /api/analytics")), calls.join("\n")).toEqual([]);
    }
    expect(errors).toEqual([]);
    await context.close();
    // The visits of this test leave the test database: the statistics tests count the people of the period.
    const visitors = await database(async client => (await client.query(
      "SELECT DISTINCT visitor_id FROM grimorio_analytics_events WHERE entry='bio' AND received_at >= $1", [since])).rows.map(row => row.visitor_id));
    expect(visitors.length).toBe(1);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await database(client => client.query("DELETE FROM grimorio_analytics_events WHERE visitor_id = ANY($1)", [visitors]));
  });
}
