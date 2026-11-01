import { test, expect } from "./fixtures.mjs";

// PROMPT 31, the visitor: an arrival from the link of the Instagram bio (?da=bio) said with the first page view and
// taken off the address; navigation, search and filters with no request more than before: the search where it was
// typed and the groups of filters ride in the events already sent. The statistics server is simulated (as in
// e2e/valutazione.spec.mjs): the events sent are kept here.
async function statistics(context) {
  const state = { events: [], requests: [] };
  await context.route("**/api/analytics", async route => {
    const request = route.request();
    if (request.method() === "GET") return route.fulfill({ json: { enabled: true, excluded: false, consent: "accepted" } });
    state.events.push(JSON.parse(request.postData() || "{}"));
    return route.fulfill({ json: { ok: true, stored: true } });
  });
  return state;
}

test("?da=bio counted with the page view and taken off; navigation, search and filters with no request more", async ({ browser }) => {
  test.setTimeout(120_000);
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => {
    try {
      localStorage.setItem("grimorio.edizione", "2024");
      localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5));
    } catch { /* no storage */ }
  });
  const state = await statistics(context);
  const page = await context.newPage();
  // Every request the page makes after it has loaded: XHR and fetch only (pages, scripts and pictures aside).
  const calls = [];
  page.on("request", request => { if (["fetch", "xhr"].includes(request.resourceType())) calls.push(`${request.method()} ${new URL(request.url()).pathname}`); });

  await page.goto("/?da=bio");
  await expect.poll(() => state.events.filter(event => event.event === "page_view").length).toBe(1);
  const first = state.events[0];
  expect(first).toMatchObject({ event: "page_view", origin: "instagram", bio: true });
  // The mark leaves the address without a new page: the same document.
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => performance.getEntriesByType("navigation").length)).toBe(1);
  expect(state.events.some(event => event.event === "arrivo_da_amico")).toBe(false);

  // The spells: a page view, no «bio» any more (the session keeps Instagram as its origin).
  await page.goto("/grimorio");
  await expect.poll(() => state.events.filter(event => event.event === "page_view").length).toBe(2);
  expect(state.events.at(-1)).toMatchObject({ event: "page_view", origin: "instagram" });
  expect(state.events.at(-1).bio).toBeUndefined();

  // Filters: applying one makes no request at all.
  const before = calls.length;
  await page.getByRole("button", { name: "Filtri" }).click();
  const panel = page.getByRole("dialog", { name: "Filtri" });
  await panel.getByRole("button", { name: "Livello 3", exact: true }).click();
  await panel.getByRole("button", { name: /^Mostra \d+ risultat/ }).click();
  await expect(page.getByRole("button", { name: "Filtri, 1 attivo" })).toBeVisible();
  await page.waitForTimeout(1500);
  expect(calls.slice(before), "no request for a filter").toEqual([]);

  // A search with no result: one event as before, with where it was typed and the filter applied before it.
  await page.getByRole("searchbox", { name: "Cerca un incantesimo" }).fill("zzqx nessuno");
  await expect.poll(() => state.events.filter(event => event.event === "search").length).toBe(1);
  expect(state.events.find(event => event.event === "search")).toMatchObject({ query: "zzqx nessuno", results: 0, area: "incantesimi", filters: ["livello"] });
  // Sent once: the next page view carries no filter.
  await page.goto("/bestiario");
  await expect.poll(() => state.events.filter(event => event.event === "page_view").length).toBe(3);
  expect(state.events.at(-1).filters).toBeUndefined();

  // The requests of the whole visit: only /api/analytics, one GET for the status and one POST per event, as before.
  const posts = calls.filter(call => call === "POST /api/analytics").length;
  expect(posts).toBe(state.events.length);
  // No endpoint of its own: besides /api/analytics, only what the pages already asked (pages prefetched by the links).
  expect(calls.filter(call => call.includes(" /api/") && !call.endsWith(" /api/analytics")), calls.join("\n")).toEqual([]);
  expect(state.events.map(event => event.event).filter(name => !["page_view", "search"].includes(name))).toEqual([]);
  await context.close();
});

// PROMPT 32: a page not found sends «not_found» in place of the page view, with the path only.
test("a page not found: «not_found» with the path asked, no parameters, no page view", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 } });
  const state = await statistics(context);
  const page = await context.newPage();
  await page.goto("/pagina-che-non-esiste-xq?da=altro#qui");
  await expect(page.getByRole("heading", { name: "Pagina non trovata" })).toBeVisible();
  await expect.poll(() => state.events.length).toBe(1);
  expect(state.events[0]).toMatchObject({ event: "not_found", path: "/pagina-che-non-esiste-xq" });
  await context.close();
});

// PROMPT 32: the LCP on 1 visit in 10 (Math.random fixed here), with the next page view; the uses of the form too.
for (const [random, sampled] of [[0.05, true], [0.5, false]]) {
  test(`LCP ${sampled ? "in" : "out of"} the sample: ${sampled ? "sent with the next page view" : "never sent"}; no request more`, async ({ browser }) => {
    test.setTimeout(90_000);
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 } });
    await context.addInitScript(value => {
      Math.random = () => value;
      try { localStorage.setItem("grimorio.edizione", "2024"); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ }
    }, random);
    const state = await statistics(context);
    const page = await context.newPage();
    const calls = [];
    page.on("request", request => { if (["fetch", "xhr"].includes(request.resourceType())) calls.push(`${request.method()} ${new URL(request.url()).pathname}`); });
    await page.goto("/grimorio");
    await expect.poll(() => state.events.length).toBe(1);
    await page.waitForTimeout(800);
    // The first touch keeps the measure; it leaves with the next page view, measured on /grimorio.
    await page.mouse.click(5, 300);
    await page.goto("/bestiario/proponi");
    await expect.poll(() => state.events.length).toBe(2);
    const second = state.events[1];
    if (sampled) {
      expect(second.lcp.path).toBe("/grimorio");
      expect(second.lcp.ms).toBeGreaterThan(0);
    } else expect(second.lcp).toBeUndefined();
    // «Proponi il tuo» opened: the name rides with an event already sent, once.
    await expect(page.locator("#hb-nome")).toBeVisible();
    await page.goto("/bestiario");
    await expect.poll(() => state.events.length).toBe(3);
    // With the first event that leaves after it (often the page view of the form itself), once.
    expect(state.events.flatMap(event => event.uses ?? [])).toEqual(["proposal_start"]);
    // In the sample every page loaded is measured once, sent with the next page view; out of it, never.
    if (sampled) expect(state.events[2].lcp?.path ?? "/bestiario/proponi").toBe("/bestiario/proponi");
    else expect(state.events.some(event => event.lcp)).toBe(false);
    expect(state.events.map(event => event.event)).toEqual(["page_view", "page_view", "page_view"]);
    expect(calls.filter(call => call === "POST /api/analytics").length).toBe(3);
    expect(calls.filter(call => call.includes(" /api/") && !call.endsWith(" /api/analytics") && !call.endsWith(" /api/proposte")), calls.join("\n")).toEqual([]);
    await context.close();
  });
}
