import { test, expect } from "./fixtures.mjs";

// PROMPT 45 (Google): robots.txt, sitemap.xml, canonical, titles and descriptions, one H1, JSON-LD, no X-Powered-By.
// Local test database only: the card hidden with the eye is shown again at the end.

const SITE = "https://ilgrimorio.app";
const headOf = html => html.slice(0, html.indexOf("</head>"));
const titleOf = html => headOf(html).match(/<title>([^<]*)<\/title>/)?.[1]?.replace(/&amp;/g, "&");
const metaOf = (html, name) => headOf(html).match(new RegExp(`<meta (?:name|property)="${name}" content="([^"]*)"`))?.[1]?.replace(/&amp;/g, "&").replace(/&#x27;/g, "'");
const canonicalOf = html => headOf(html).match(/<link rel="canonical" href="([^"]*)"/)?.[1];
const jsonLdOf = html => [...html.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)].map(match => JSON.parse(match[1]));
const locsOf = xml => [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(match => match[1]);

test("robots.txt and sitemap.xml: 200, right format, both editions, nothing reserved", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(robots.headers()["content-type"]).toContain("text/plain");
  const text = await robots.text();
  expect(text).toContain("User-Agent: *");
  expect(text).toContain("Allow: /");
  for (const path of ["/admin", "/api/", "/account", "/personaggi", "/segnala", "/bestiario/proponi"]) expect(text).toContain(`Disallow: ${path}`);
  expect(text).toContain(`Sitemap: ${SITE}/sitemap.xml`);

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()["content-type"]).toContain("xml");
  const xml = await sitemap.text();
  expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  const locs = locsOf(xml);
  expect(locs.length).toBeGreaterThan(1000);
  expect(locs.length).toBeLessThan(50_000);
  expect(new Set(locs).size).toBe(locs.length);
  for (const loc of locs) expect(loc.startsWith(`${SITE}/`), loc).toBe(true);
  // A sample of both editions and of every kind of card.
  for (const path of ["/", "/grimorio", "/bestiario", "/compendio", "/spell/allarme", "/spell/allarme-2014", "/mostro/aboleth", "/mostro/aboleth-2014",
    "/classi/mago", "/equipaggiamento/armi/tridente", "/equipaggiamento/armature/scudo", "/oggetti-magici/ali-del-volo", "/manuale/condizioni-accecato", "/regole/concentrazione"]) {
    expect(locs, path).toContain(path === "/" ? `${SITE}/` : `${SITE}${path}`);
  }
  for (const loc of locs) {
    expect(loc.slice(SITE.length).replace(/^\/manuale\/condizioni-/, "/condizioni/"), loc).not.toMatch(/^\/(admin|api|account|personaggi|segnala|preferiti|dadi|manuale|in-arrivo|immagini-mostri)(\/|$)|\/proponi|[?#]|\.(webp|png|jpe?g|svg)$/);
  }
});

test("a card hidden with the eye leaves the sitemap at once and comes back", async ({ page, request }) => {
  test.setTimeout(240_000);
  const has = async () => locsOf(await (await request.get("/sitemap.xml")).text()).includes(`${SITE}/mostro/aboleth`);
  expect(await has()).toBe(true);
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
  await page.goto("/admin/mostri");
  await page.getByRole("group", { name: "Edizione dell’area riservata" }).getByRole("button", { name: "2024" }).click();
  await expect(page.getByTestId("admin-edition-band")).toHaveText("2024");
  await page.getByPlaceholder("Cerca per nome o tipo…").fill("aboleth");
  const row = page.locator("main ul li[data-card-row]").filter({ hasText: "Aboleth" }).first();
  await row.getByRole("switch", { name: "Visibile sul sito: Aboleth" }).click();
  await expect(row).toHaveAttribute("data-hidden", "");
  await expect.poll(has).toBe(false);
  await row.getByRole("switch", { name: "Visibile sul sito: Aboleth" }).click();
  await expect(row).not.toHaveAttribute("data-hidden", "");
  await expect.poll(has).toBe(true);
  for (const path of ["/mostro/aboleth", "/bestiario", "/ricerca-indice.json", "/sitemap.xml"]) expect((await request.get(path)).status(), path).toBe(200);
});

test("canonical, titles and descriptions: no parameters, 2014 and 2024 apart, 70–160 characters, all different", async ({ request }) => {
  test.setTimeout(120_000);
  const pages = [
    ["/", "/"], ["/grimorio", "/grimorio"], ["/bestiario", "/bestiario"], ["/compendio", "/compendio"],
    ["/spell/allarme?da=amico", "/spell/allarme"], ["/spell/allarme-2014", "/spell/allarme-2014"],
    ["/mostro/aboleth", "/mostro/aboleth"], ["/mostro/aboleth-2014?x=1", "/mostro/aboleth-2014"],
    ["/classi/mago", "/classi/mago"], ["/equipaggiamento/armi/tridente", "/equipaggiamento/armi/tridente"],
    ["/equipaggiamento/armature/scudo", "/equipaggiamento/armature/scudo"], ["/oggetti-magici/ali-del-volo", "/oggetti-magici/ali-del-volo"],
    ["/manuale/condizioni-accecato", "/manuale/condizioni-accecato"], ["/manuale/condizioni-accecato-2014", "/manuale/condizioni-accecato-2014"],
    ["/regole/concentrazione", "/regole/concentrazione"], ["/info", "/info"],
  ];
  const titles = new Set(), descriptions = new Set();
  for (const [path, canonical] of pages) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()["x-powered-by"], path).toBeUndefined();
    const html = await response.text();
    expect(canonicalOf(html), path).toBe(canonical === "/" ? SITE : `${SITE}${canonical}`);
    const title = titleOf(html), description = metaOf(html, "description");
    expect(title, path).toMatch(/Il Grimorio\.App/);
    expect(description.length, `${path}: ${description}`).toBeGreaterThanOrEqual(70);
    expect(description.length, `${path}: ${description}`).toBeLessThanOrEqual(160);
    expect(metaOf(html, "og:title"), path).toBe(title);
    expect(metaOf(html, "og:description"), path).toBe(description);
    expect(metaOf(html, "twitter:title"), path).toBe(title);
    expect(metaOf(html, "twitter:description"), path).toBe(description);
    expect(titles.has(title), `${path}: ${title}`).toBe(false);
    expect(descriptions.has(description), `${path}: ${description}`).toBe(false);
    titles.add(title);
    descriptions.add(description);
  }
  const spell = titleOf(await (await request.get("/spell/allarme")).text());
  const spell2014 = titleOf(await (await request.get("/spell/allarme-2014")).text());
  expect(spell).toBe("Allarme — Incantesimi · Il Grimorio.App");
  expect(spell2014).toBe("Allarme (2014) — Incantesimi · Il Grimorio.App");
  expect(titleOf(await (await request.get("/mostro/aboleth-2014")).text())).toBe("Aboleth (2014) — Bestiario · Il Grimorio.App");
});

test("one H1 per page", async ({ page }) => {
  test.setTimeout(120_000);
  for (const path of ["/", "/grimorio", "/spell/allarme", "/mostro/aboleth", "/classi/mago", "/equipaggiamento/armi/tridente", "/equipaggiamento/armature/scudo",
    "/equipaggiamento/avventura/abaco", "/equipaggiamento/strumenti/liuto", "/oggetti-magici/ali-del-volo", "/bestiario/creati-da-voi", "/manuale/condizioni-accecato"]) {
    await page.goto(path);
    await expect(page.locator("h1"), path).toHaveCount(1);
  }
  // «Beta» stays next to the title, out of the H1.
  await page.goto("/bestiario/creati-da-voi");
  await expect(page.locator("h1")).toHaveText("I mostri creati da voi");
});

test("JSON-LD: WebSite with the real search in the Home, BreadcrumbList on cards and sections", async ({ page, request }) => {
  const home = jsonLdOf(await (await request.get("/")).text());
  const site = home.find(item => item["@type"] === "WebSite");
  expect(site.url).toBe(`${SITE}/`);
  expect(site.potentialAction.target.urlTemplate).toBe(`${SITE}/?cerca={search_term_string}`);
  const card = jsonLdOf(await (await request.get("/spell/allarme-2014")).text()).find(item => item["@type"] === "BreadcrumbList");
  expect(card.itemListElement.map(item => [item.position, item.name, item.item])).toEqual([
    [1, "Home", `${SITE}/`], [2, "Incantesimi", `${SITE}/grimorio`], [3, "Allarme (2014)", `${SITE}/spell/allarme-2014`],
  ]);
  const section = jsonLdOf(await (await request.get("/bestiario")).text()).find(item => item["@type"] === "BreadcrumbList");
  expect(section.itemListElement.at(-1).item).toBe(`${SITE}/bestiario`);
  for (const path of ["/", "/spell/allarme", "/mostro/aboleth"]) {
    expect(JSON.stringify(jsonLdOf(await (await request.get(path)).text())), path).not.toMatch(/"Product"|"Review"|"AggregateRating"/);
  }
  // The SearchAction leads to a working search: /?cerca= opens the panel with the word.
  await page.goto("/?cerca=palla");
  await expect(page.getByRole("searchbox").first()).toHaveValue("palla");
});
