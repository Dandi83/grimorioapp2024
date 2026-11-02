import { test, expect } from "./fixtures.mjs";

// PROMPT 47: the eight weapon masteries of the 2024 rules: «Vessazione (Vex)» on the weapon card with the link to its page,
// a page each, the search in Italian and in English. Local test database only: the section «Armi» is shown again at the end.

const MASTERIES = [
  ["colpo-di-striscio", "Colpo di striscio", "Graze", 2], ["doppio-fendente", "Doppio fendente", "Cleave", 2], ["fiaccare", "Fiaccare", "Sap", 6],
  ["graffio", "Graffio", "Nick", 4], ["lentezza", "Lentezza", "Slow", 7], ["rovesciamento", "Rovesciamento", "Topple", 5],
  ["spinta", "Spinta", "Push", 4], ["vessazione", "Vessazione", "Vex", 8],
];
const SITE = "https://ilgrimorio.app";

async function visitor(browser, width, edition) {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: width < 600 ? 844 : 900 } });
  await context.addInitScript(value => {
    try { localStorage.setItem("grimorio.edizione", value); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ }
  }, edition);
  return context;
}
const noSideScroll = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test("the eight pages: 200, title with the English name, the SRD text of the weapon card, the weapons, the links, the sitemap", async ({ request }) => {
  test.setTimeout(180_000);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const [id, name, english, count] of MASTERIES) {
    const response = await request.get(`/equipaggiamento/padronanze/${id}`);
    expect(response.status(), id).toBe(200);
    const html = await response.text();
    expect(html.match(/<title>([^<]*)<\/title>/)?.[1], id).toBe(`${name} (${english}) — Padronanze · Il Grimorio.App`);
    expect(html, id).toContain(`<link rel="canonical" href="${SITE}/equipaggiamento/padronanze/${id}"/>`);
    const description = (html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "").replace(/&amp;/g, "&");
    expect(description.length, id).toBeGreaterThanOrEqual(70);
    expect(description.length, id).toBeLessThanOrEqual(160);
    expect(sitemap, id).toContain(`<loc>${SITE}/equipaggiamento/padronanze/${id}</loc>`);
    // The weapons: as many as expected, each a working link to its card.
    const links = [...html.matchAll(/data-mastery-weapons=""[\s\S]*?<\/ul>/g)][0][0].match(/href="\/equipaggiamento\/armi\/[a-z0-9-]+"/g);
    expect(links.length, id).toBe(count);
  }
});

test("Vessazione at 390 and 1280: title, pill, subtitle, text identical to the weapon card, weapons, back to Armi, breadcrumb", async ({ browser }) => {
  test.setTimeout(180_000);
  for (const width of [390, 1280]) {
    const context = await visitor(browser, width, "2024");
    const page = await context.newPage();
    // The text on the card of the Ascia (2024), the source of the page.
    await page.goto("/equipaggiamento/armi/ascia");
    const card = page.locator('[data-edition="2024"] section[aria-label="Padronanza"]');
    await expect(card.locator("[data-english-name]")).toHaveText("(Vex)");
    const cardText = await card.locator("p").nth(1).textContent();
    await expect(card.locator("[data-mastery-link]")).toHaveText("Tutte le armi con Vessazione ›");
    await card.locator("[data-mastery-link]").click();
    await expect(page).toHaveURL(/\/equipaggiamento\/padronanze\/vessazione$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Vessazione(Vex)");
    await expect(page.locator("h1 [data-english-name]")).toHaveCSS("font-style", "italic");
    await expect(page.locator('[data-edition="2024"]').getByText("Padronanza delle armi")).toBeVisible();
    await expect(page.locator('[data-edition="2024"] span[title^="Edizione delle regole"]')).toContainText("2024");
    expect(await page.locator("[data-mastery-text] p").textContent()).toBe(cardText);
    await expect(page.getByRole("heading", { name: "Armi con Vessazione" })).toBeVisible();
    await expect(page.locator("[data-mastery-weapons] a")).toHaveCount(8);
    await expect(page.locator("[data-mastery-weapons] a").first()).toContainText("Ascia");
    await expect(page.locator("[data-source-box]")).toContainText("SRD 5.2.1 italiano");
    expect(await noSideScroll(page), `${width}: no horizontal scroll`).toBe(true);
    const crumbs = JSON.parse(await page.locator('script[type="application/ld+json"]').first().textContent());
    expect(crumbs.itemListElement.map(item => item.name)).toEqual(["Home", "Compendio", "Armi", "Vessazione"]);
    await page.locator("[data-mastery-back]").click();
    await expect(page).toHaveURL(/\/equipaggiamento\/armi$/);
    // The list keeps the pill in Italian only.
    await expect(page.locator("body")).not.toContainText("(Vex)");
    await context.close();
  }
});

test("2014: the card has no mastery; the page says it is a 2024 rule", async ({ browser }) => {
  const context = await visitor(browser, 390, "2014");
  const page = await context.newPage();
  await page.goto("/equipaggiamento/armi/ascia");
  await expect(page.locator('[data-edition="2014"] section[aria-label="Padronanza"]')).toHaveCount(0);
  await expect(page.locator('[data-edition="2014"] [data-mastery-link]')).toHaveCount(0);
  await page.goto("/equipaggiamento/padronanze/fiaccare");
  await expect(page.getByRole("status").filter({ hasText: "Regola nuova nel 2024" })).toBeVisible();
  await expect(page.locator('[data-edition="2024"] h1')).toContainText("Fiaccare");
  expect(await noSideScroll(page)).toBe(true);
  await context.close();
});

test("search: «vex» with «in inglese: Vex», «fiacc», «vesazione»; in 2014 among the 2024-only results", async ({ browser }) => {
  test.setTimeout(180_000);
  for (const edition of ["2024", "2014"]) {
    const context = await visitor(browser, 390, edition);
    const page = await context.newPage();
    const search = async query => {
      await page.goto(`/?cerca=${encodeURIComponent(query)}`);
      const dialog = page.getByRole("dialog", { name: "Cerca in tutto il Grimorio" });
      await expect(dialog.locator("#search-results")).toBeVisible();
      await expect(dialog.getByRole("status")).toHaveText(/risultat|trovat|simil/i);
      const other = dialog.getByRole("button", { name: /^Cerca anche nel 2024/ });
      if (edition === "2014") { await expect(other.first()).toBeVisible(); await other.first().click(); }
      return dialog;
    };
    const href = id => `/equipaggiamento/padronanze/${id}${edition === "2014" ? "?edizione=2024" : ""}`;
    let dialog = await search("vex");
    const vex = dialog.locator(`a[href="${href("vessazione")}"]`);
    await expect(vex).toContainText("Vessazione");
    await expect(vex).toContainText("Padronanza");
    await expect(vex.locator("[data-in-inglese]")).toHaveText("in inglese: Vex");
    await expect(vex.locator("[data-in-inglese] mark")).toHaveText("Vex");
    dialog = await search("fiacc");
    await expect(dialog.locator(`a[href="${href("fiaccare")}"]`)).toContainText("Fiaccare");
    dialog = await search("vesazione");
    await expect(dialog.locator(`a[href="${href("vessazione")}"]`)).toBeVisible();
    await dialog.locator(`a[href="${href("vessazione")}"]`).click();
    await expect(page.getByRole("heading", { level: 1 }).filter({ visible: true })).toContainText("Vessazione");
    await context.close();
  }
});

test("the section «Armi» hidden: the masteries answer 404 and leave the sitemap and the search", async ({ page, request }) => {
  test.setTimeout(240_000);
  const stateRadio = (title, label) => page.getByRole("radiogroup", { name: `Stato di ${title}`, exact: true }).getByRole("radio", { name: label, exact: true });
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
  await page.goto("/admin/sezioni");
  try {
    await stateRadio("Armi", "Nascosta").click();
    await expect(stateRadio("Armi", "Nascosta")).toHaveAttribute("aria-checked", "true");
    await expect.poll(async () => (await request.get("/equipaggiamento/padronanze/vessazione")).status()).toBe(404);
    await expect.poll(async () => (await request.get("/sitemap.xml")).text()).not.toContain("/equipaggiamento/padronanze/");
    await expect.poll(async () => (await request.get("/ricerca-indice.json")).text()).not.toContain("/equipaggiamento/padronanze/");
  } finally {
    await page.goto("/admin/sezioni");
    await stateRadio("Armi", "Visibile").click();
    await expect(stateRadio("Armi", "Visibile")).toHaveAttribute("aria-checked", "true");
  }
  await expect.poll(async () => (await request.get("/equipaggiamento/padronanze/vessazione")).status()).toBe(200);
  for (const path of ["/equipaggiamento/armi", "/equipaggiamento/armi/ascia", "/sitemap.xml", "/ricerca-indice.json"]) expect((await request.get(path)).status(), path).toBe(200);
});
