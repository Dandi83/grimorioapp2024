import { test, expect } from "./fixtures.mjs";

// PROMPT 48: the weapon properties, a page each in both editions («Speciale» 2014 only), the English name on the weapon
// cards with the link, the search in Italian and in English. Local test database only: «Armi» is shown again at the end.

// id, name, English, weapons 2024, weapons 2014 (null: not in that edition).
const PROPERTIES = [
  ["accurata", "Accurata", "Finesse", 6, 6], ["due-mani", "Due mani", "Two-Handed", 13, 11], ["gittata", "Gittata", "Range", 16, 15],
  ["lancio", "Lancio", "Thrown", 7, 8], ["leggera", "Leggera", "Light", 8, 8], ["munizioni", "Munizioni", "Ammunition", 9, 7],
  ["pesante", "Pesante", "Heavy", 9, 8], ["portata", "Portata", "Reach", 5, 5], ["ricarica", "Ricarica", "Loading", 6, 4],
  ["speciale", "Speciale", "Special", null, 2], ["versatile", "Versatile", "Versatile", 7, 6],
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

test("the eleven pages: 200, titles with the English name, both editions, the weapons of each edition, the sitemap", async ({ request }) => {
  test.setTimeout(180_000);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const [id, name, english, count2024, count2014] of PROPERTIES) {
    const response = await request.get(`/equipaggiamento/proprieta/${id}`);
    expect(response.status(), id).toBe(200);
    const html = await response.text();
    expect(html.match(/<title>([^<]*)<\/title>/)?.[1], id).toBe(`${name} (${english})${count2024 === null ? " (2014)" : ""} — Proprietà · Il Grimorio.App`);
    expect(html, id).toContain(`<link rel="canonical" href="${SITE}/equipaggiamento/proprieta/${id}"/>`);
    const description = (html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "").replace(/&amp;/g, "&");
    expect(description.length, id).toBeGreaterThanOrEqual(70);
    expect(description.length, id).toBeLessThanOrEqual(160);
    expect(sitemap, id).toContain(`<loc>${SITE}/equipaggiamento/proprieta/${id}</loc>`);
    // The weapons of each edition, in its panel.
    for (const [edition, count] of [["2024", count2024], ["2014", count2014]]) {
      const panel = html.match(new RegExp(`data-edition="${edition}"[\\s\\S]*?data-property-weapons=""([\\s\\S]*?)</ul>`));
      if (count === null) expect(panel, `${id} ${edition}`).toBeNull();
      else expect(panel[1].match(/href="\/equipaggiamento\/armi\/[a-z0-9-]+/g).length, `${id} ${edition}`).toBe(count);
    }
  }
});

for (const edition of ["2024", "2014"]) {
  test(`${edition} at 390 and 1280: the Pugnale card with «(Light)» and the link, the page with the same text, back to Armi`, async ({ browser }) => {
    test.setTimeout(180_000);
    for (const width of [390, 1280]) {
      const context = await visitor(browser, width, edition);
      const page = await context.newPage();
      await page.goto("/equipaggiamento/armi/pugnale");
      const card = page.locator(`[data-edition="${edition}"] section[aria-label="Proprietà"] > div`).filter({ has: page.locator('[data-property-link="leggera"]') });
      await expect(card.locator("[data-english-name]")).toHaveText("(Light)");
      const cardText = await card.locator("p").nth(1).textContent();
      await expect(card.locator('[data-property-link="leggera"]')).toHaveText("Tutte le armi con Leggera ›");
      await card.locator('[data-property-link="leggera"]').click();
      await expect(page).toHaveURL(new RegExp(`/equipaggiamento/proprieta/leggera${edition === "2014" ? "\\?edizione=2014" : ""}$`));
      const panel = page.locator(`[data-edition="${edition}"]`);
      await expect(panel.getByRole("heading").first()).toHaveText("Leggera(Light)");
      await expect(panel.getByText("Proprietà delle armi", { exact: true })).toBeVisible();
      await expect(panel.locator('span[title^="Edizione delle regole"]')).toContainText(edition);
      expect(await panel.locator("[data-property-text] p").first().textContent()).toBe(cardText);
      await expect(panel.locator("[data-property-weapons] a")).toHaveCount(8);
      await expect(panel.locator("[data-source-box]")).toContainText(edition === "2014" ? "SRD 5.1 italiano" : "SRD 5.2.1 italiano");
      expect(await noSideScroll(page), `${edition} ${width}`).toBe(true);
      await page.locator("[data-property-back]").click();
      await expect(page).toHaveURL(/\/equipaggiamento\/armi$/);
      await expect(page.locator("body")).not.toContainText("(Light)");
      await context.close();
    }
  });
}

test("«Speciale»: 2014 only; in 2024 the page says so", async ({ browser }) => {
  const context = await visitor(browser, 390, "2024");
  const page = await context.newPage();
  await page.goto("/equipaggiamento/proprieta/speciale");
  await expect(page.getByRole("status").filter({ hasText: "Proprietà solo nelle regole 2014" })).toBeVisible();
  await expect(page.locator('[data-edition="2014"] h1')).toContainText("Speciale");
  await expect(page.locator('[data-edition="2024"]')).toHaveCount(0);
  expect(await noSideScroll(page)).toBe(true);
  await context.close();
});

test("search: «light» with «in inglese: Light», «legg», «special» in 2024 and 2014", async ({ browser }) => {
  test.setTimeout(180_000);
  for (const edition of ["2024", "2014"]) {
    const context = await visitor(browser, 390, edition);
    const page = await context.newPage();
    const search = async (query, other) => {
      await page.goto(`/?cerca=${encodeURIComponent(query)}`);
      const dialog = page.getByRole("dialog", { name: "Cerca in tutto il Grimorio" });
      await expect(dialog.locator("#search-results")).toBeVisible();
      await expect(dialog.getByRole("status")).toHaveText(/risultat|trovat|simil/i);
      if (other) { const button = dialog.getByRole("button", { name: new RegExp(`^Cerca anche nel ${other}`) }); await expect(button.first()).toBeVisible(); await button.first().click(); }
      return dialog;
    };
    let dialog = await search("light");
    const light = dialog.locator('a[href^="/equipaggiamento/proprieta/leggera"]');
    await expect(light).toContainText("Leggera");
    await expect(light).toContainText("Proprietà");
    await expect(light.locator("[data-in-inglese]")).toHaveText("in inglese: Light");
    await expect(light.locator("[data-in-inglese] mark")).toHaveText("Light");
    dialog = await search("legg");
    await expect(dialog.locator('a[href^="/equipaggiamento/proprieta/leggera"]')).toContainText("Leggera");
    // «Speciale» is a 2014 rule: in 2024 among the results of the other edition.
    dialog = await search("special", edition === "2024" ? "2014" : null);
    await expect(dialog.locator('a[href^="/equipaggiamento/proprieta/speciale"]')).toContainText("Speciale");
    await context.close();
  }
});

test("the section «Armi» hidden: the properties answer 404 and leave the sitemap and the search", async ({ page, request }) => {
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
    await expect.poll(async () => (await request.get("/equipaggiamento/proprieta/leggera")).status()).toBe(404);
    await expect.poll(async () => (await request.get("/sitemap.xml")).text()).not.toContain("/equipaggiamento/proprieta/");
    await expect.poll(async () => (await request.get("/ricerca-indice.json")).text()).not.toContain("/equipaggiamento/proprieta/");
  } finally {
    await page.goto("/admin/sezioni");
    await stateRadio("Armi", "Visibile").click();
    await expect(stateRadio("Armi", "Visibile")).toHaveAttribute("aria-checked", "true");
  }
  await expect.poll(async () => (await request.get("/equipaggiamento/proprieta/leggera")).status()).toBe(200);
  for (const path of ["/equipaggiamento/armi", "/equipaggiamento/armi/pugnale", "/sitemap.xml", "/ricerca-indice.json"]) expect((await request.get(path)).status(), path).toBe(200);
});
