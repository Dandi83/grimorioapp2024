import { readFileSync } from "node:fs";
import { test, expect, devices } from "./fixtures.mjs";

// PROMPT 64 («pergamena illustrata», passo 1): the shared ornaments on the Home and on «I miei personaggi», the 12 class
// portraits only on /personaggi (never on other pages, never from totalpartykill.app), the credit on /fonti.
const BRENNA = readFileSync(new URL("../tests/scheda-tpk-grimorio.cjs", import.meta.url), "utf8").match(/'(#pg=[^']+)'/)[1];
const strip = device => { const copy = { ...device }; delete copy.defaultBrowserType; return copy; };
const SCREENS = [
  ["iPhone 390", strip({ ...devices["iPhone 13"], viewport: { width: 390, height: 844 } })],
  ["Android 412", strip(devices["Pixel 7"])],
  ["computer 1280", strip({ ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 }, screen: { width: 1280, height: 900 } })],
];
const BORDEAUX = "rgb(122, 31, 43)";
const AMBER = "rgb(224, 162, 26)";

async function newPage(browser, device) {
  const context = await browser.newContext({ ...device, baseURL: test.info().project.use.baseURL, serviceWorkers: "block" });
  await context.addInitScript(() => { try { localStorage.setItem("grimorio.edizione", "2024"); localStorage.setItem("grimorio.statistiche", "no"); } catch { /* no storage */ } });
  const portraits = [], tpk = [];
  context.on("request", request => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/ritratti/") || url.searchParams.get("url")?.startsWith("/ritratti/")) portraits.push(url.pathname);
    if (url.hostname.endsWith("totalpartykill.app")) tpk.push(request.url());
  });
  return { context, page: await context.newPage(), portraits, tpk };
}

for (const [name, device] of SCREENS) {
  test(`${name}: the Home in «pergamena illustrata», no portrait loaded on the public pages`, async ({ browser }) => {
    const { context, page, portraits, tpk } = await newPage(browser, device);
    const wide = name.startsWith("computer");
    await page.goto("/");
    // Logo: «I» and «G» bordeaux capilettera, «.App» amber; the text is still «Il Grimorio.App».
    const logo = wide ? page.locator("[data-side-nav] a").first() : page.locator("header").first().locator("div").first();
    await expect(logo).toHaveText("Il Grimorio.App");
    const letters = logo.locator(".pg-lettera");
    await expect(letters).toHaveText(["I", "G"]);
    for (const letter of await letters.all()) await expect(letter).toHaveCSS("color", BORDEAUX);
    await expect(logo.locator(".text-amber")).toHaveCSS("color", AMBER);
    // The label above the sentence, the light divider with ✦ under it.
    const label = page.locator("section .pg-etichetta");
    await expect(label).toHaveText("Compendio D&D 5e · SRD in italiano");
    await expect(label).toHaveCSS("text-transform", "uppercase");
    const quote = await page.locator("#home-quote").boundingBox();
    expect((await label.boundingBox()).y).toBeLessThan(quote.y);
    const divider = page.locator('section [data-divisore="stella"]');
    await expect(divider).toBeVisible();
    expect((await divider.boundingBox()).y).toBeGreaterThan(quote.y + quote.height - 1);
    await expect(divider).toHaveClass(/pg-divisore-chiaro/);
    // Torn paper: at the bottom of the picture on phones, on its right side on computers.
    const edge = await page.locator("#home-quote").locator("xpath=ancestor::section[1]").evaluate(section => {
      const style = getComputedStyle(section, "::after"), box = section.getBoundingClientRect();
      return { image: style.backgroundImage, width: parseFloat(style.width), height: parseFloat(style.height), section: box.width };
    });
    expect(edge.image).toContain("data:image/svg+xml");
    if (wide) expect(edge.width).toBe(16); else expect(edge.height).toBe(16);
    // Computer: the shortcuts are cream tags with a small ink icon, to the same places as before.
    if (wide) {
      const tags = page.getByRole("navigation", { name: "Scorciatoie" }).getByRole("link");
      await expect(tags).toHaveCount(3);
      expect(await tags.evaluateAll(links => links.map(link => new URL(link.href).pathname))).toEqual(["/grimorio", "/bestiario", "/compendio"]);
      for (const tag of await tags.all()) {
        await expect(tag).toHaveCSS("background-color", "rgb(255, 251, 240)");
        await expect(tag).toHaveCSS("color", "rgb(43, 33, 24)");
        await expect(tag.locator("svg")).toHaveCount(1);
      }
      await expect(page.locator('a[href="/personaggi"]')).toHaveCount(0);
    }
    // The paper texture: one small SVG behind the page, nothing animated.
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundImage)).toContain("feTurbulence");
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    for (const path of ["/grimorio", "/bestiario", "/compendio", "/fonti"]) await page.goto(path);
    await expect(page.locator("[data-credito-ritratti]")).toHaveText("Ritratti delle classi: grafica originale © 2026 D.d.B.");
    await page.waitForTimeout(500);
    expect(portraits).toEqual([]);
    expect(tpk).toEqual([]);
    await context.close();
  });
}

test("I miei personaggi: label, capilettera, ⚔ divider, BETA stamp, round portrait, copper corners", async ({ browser }) => {
  test.setTimeout(120_000);
  const { context, page, portraits, tpk } = await newPage(browser, SCREENS[0][1]);
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
  await page.evaluate(() => localStorage.removeItem("grimorio.characters.v1"));
  // The admin pages load no portrait either.
  expect(portraits).toEqual([]);

  await page.goto("/personaggi");
  const title = page.getByRole("heading", { level: 1, name: /I miei personaggi/ });
  await expect(title).toBeVisible();
  await expect(page.locator("header .pg-etichetta")).toHaveText("La tua compagnia");
  await expect(page.locator('header [data-divisore="spade"]')).toBeVisible();
  const stamp = title.locator("[data-beta-label]");
  await expect(stamp).toHaveText("BETA");
  await expect(stamp).toHaveCSS("color", BORDEAUX);
  expect(await stamp.evaluate(el => getComputedStyle(el).transform)).not.toBe("none");
  // The capilettera does not move the line: the title is as tall with and without it.
  const heights = await title.evaluate(h1 => {
    const stampEl = h1.querySelector("[data-beta-label]"); stampEl.style.display = "none";
    const withLetter = h1.getBoundingClientRect().height;
    h1.classList.remove("pg-capolettera");
    const without = h1.getBoundingClientRect().height;
    h1.classList.add("pg-capolettera"); stampEl.style.display = "";
    return { withLetter, without, letter: getComputedStyle(h1, "::first-letter").color };
  });
  expect(heights.withLetter).toBe(heights.without);
  expect(heights.letter).toBe(BORDEAUX);
  expect(portraits).toEqual([]);

  await page.goto(`/personaggi?apertura=1${BRENNA}`);
  const summary = page.locator('[data-incoming-summary="Brenna"]');
  await expect(summary).toHaveClass(/pg-angoli/);
  const portrait = summary.getByRole("img", { name: "Ritratto del Druido" });
  await expect.poll(() => portrait.evaluate(img => img.complete && img.naturalWidth)).toBe(256);
  expect(await portrait.getAttribute("src")).toBe("/ritratti/classi/classe-druido.webp");
  expect(await portrait.getAttribute("loading")).toBe("lazy");
  // A circle (rounded-full: an «infinite» radius, at least half the side).
  expect(await summary.locator("[data-class-portrait]").evaluate(el => parseFloat(getComputedStyle(el).borderTopLeftRadius) >= el.offsetWidth / 2)).toBe(true);
  await expect(summary.locator("[data-class-portrait]")).toHaveCSS("border-top-color", BORDEAUX);
  expect(await summary.evaluate(el => getComputedStyle(el).backgroundImage.match(/data:image\/svg\+xml/g)?.length)).toBe(4);
  await page.getByRole("button", { name: "Salva nei miei personaggi" }).click();
  const card = page.locator('[data-character-card="Brenna"]');
  await expect(card).toHaveClass(/pg-angoli/);
  await expect(card.getByRole("img", { name: "Ritratto del Druido" })).toBeVisible();
  await card.click();
  await expect(page.locator('[data-character-sheet="Brenna"]').getByRole("img", { name: "Ritratto del Druido" })).toBeVisible();
  // Only the portrait of the class shown, from this site.
  expect([...new Set(portraits)]).toEqual(["/ritratti/classi/classe-druido.webp"]);
  expect(tpk).toEqual([]);
  await page.evaluate(() => localStorage.removeItem("grimorio.characters.v1"));
  await context.close();
});

// PROMPT 65 («pergamena illustrata», passo 2): sheets, list headers, Compendio and the «PRESTO» stamp. The style dresses
// titles and frames only: one H1 with the same text, the label above made of words of the app, the capilettera that does
// not move the line, the divider with ✦, copper corners only on the data box at the top.
const SHEETS = [
  ["/spell/palla-di-fuoco", "Incantesimo · 3° Livello · Invocazione", "[data-card-description]", ".pg-angoli.grid"],
  ["/spell/aiuto-2014", "Incantesimo · 2° Livello · Abiurazione", null, ".pg-angoli.grid"],
  ["/mostro/drago-nero-adulto", "Mostro · GS 14", null, "[data-monster-strip]"],
  ["/mostro/aboleth-2014", "Mostro · GS 10", null, "[data-monster-strip]"],
  ["/mostro/alce", "Animale · GS 1/4", null, "[data-monster-strip]"],
  ["/oggetti-magici/ammazzadraghi", "Oggetto magico · Raro", null, 'ul[aria-label="Tipo, rarità e sintonia"]'],
  ["/equipaggiamento/armi/spada-lunga", "Arma · 2024", null, ".pg-angoli.grid"],
  ["/equipaggiamento/armature/armatura-a-piastre", "Armatura · 2024", null, ".pg-angoli.grid"],
  ["/equipaggiamento/avventura/acido", "Equipaggiamento d’avventura · 2024", null, ".pg-angoli.grid"],
  ["/equipaggiamento/strumenti/arnesi-da-scasso", "Strumento · 2024", null, ".pg-angoli.grid"],
  ["/equipaggiamento/padronanze/fiaccare", "Padronanza delle armi · 2024", null, null],
  ["/equipaggiamento/proprieta/versatile", "Proprietà delle armi · 2024", null, null],
  ["/classi/mago", "Classe · SRD 5.2.1", null, ".pg-angoli"],
  // The label of a condition is the one already printed above its name («Condizioni»), not a new word.
  ["/manuale/condizioni-accecato", "Condizioni", null, null],
];
const LISTS = [
  ["/grimorio", "Compendio D&D 5e · 2024", "Incantesimi"], ["/bestiario", "Compendio D&D 5e · 2024", "Bestiario"],
  ["/oggetti-magici", "Compendio · 2024", "Oggetti magici"], ["/equipaggiamento/armi", "Equipaggiamento · 2024", "Armi"],
  ["/equipaggiamento/avventura", "Equipaggiamento · 2024", "Equipaggiamento d’avventura"], ["/compendio/condizioni", "Compendio · 2024", "Condizioni"],
  ["/preferiti", "Compendio D&D 5e", "Preferiti"], ["/bestiario/creature-originali", "Bestiario", "Creature originali"],
];

/** The H1 is as tall with and without its capilettera (line-height 0) and its first letter is in the given colour. */
async function capilettera(h1, colour) {
  await expect(h1).toHaveClass(/pg-capolettera/);
  const check = await h1.evaluate(el => {
    const withLetter = el.getBoundingClientRect().height;
    el.classList.remove("pg-capolettera");
    const without = el.getBoundingClientRect().height;
    el.classList.add("pg-capolettera");
    return { same: Math.abs(withLetter - without) < 0.5, colour: getComputedStyle(el, "::first-letter").color, size: getComputedStyle(el, "::first-letter").fontSize, base: getComputedStyle(el).fontSize };
  });
  expect(check.same).toBe(true);
  if (colour) expect(check.colour).toBe(colour);
  expect(parseFloat(check.size) / parseFloat(check.base)).toBeCloseTo(1.35, 2);
}

const corners = locator => locator.evaluate(el => getComputedStyle(el).backgroundImage.match(/data:image\/svg\+xml/g)?.length ?? 0);

for (const [name, device] of SCREENS) {
  test(`${name}: the sheets with label, capilettera, ✦ divider and copper corners on the data box only`, async ({ browser }) => {
    test.setTimeout(180_000);
    const { context, page, portraits } = await newPage(browser, device);
    for (const [path, label, body, box] of SHEETS) {
      await page.goto(path);
      const h1 = page.getByRole("heading", { level: 1 });
      await expect(h1, path).toHaveCount(1);
      const header = h1.locator("xpath=ancestor::*[.//*[@data-pg-etichetta]][1]");
      const kicker = header.locator("[data-pg-etichetta]").first();
      await expect(kicker, path).toHaveText(label);
      await expect(kicker).toHaveCSS("text-transform", "uppercase");
      expect((await kicker.boundingBox()).y, path).toBeLessThan((await h1.boundingBox()).y);
      await capilettera(h1, path.startsWith("/classi/") ? "rgb(255, 251, 240)" : BORDEAUX);
      const divider = header.locator('[data-divisore="stella"]').first();
      await expect(divider, path).toBeVisible();
      expect((await divider.boundingBox()).y, path).toBeGreaterThan((await h1.boundingBox()).y);
      if (box) expect(await corners(page.locator(box).first()), path).toBe(4);
      // The text of the sheet has no ornament: no capilettera, label or corners inside it.
      if (body) await expect(page.locator(`${body} .pg-capolettera, ${body} .pg-etichetta, ${body} .pg-angoli`)).toHaveCount(0);
    }
    // The ornaments are CSS and inline SVG: still no portrait loaded, nothing animated.
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    expect(portraits).toEqual([]);
    await context.close();
  });

  test(`${name}: list headers only (label, capilettera, divider); rows, filters and search as before`, async ({ browser }) => {
    test.setTimeout(120_000);
    const { context, page } = await newPage(browser, device);
    for (const [path, label, title] of LISTS) {
      await page.goto(path);
      const h1 = page.getByRole("heading", { level: 1 });
      await expect(h1, path).toHaveText(title);
      await expect(page.locator("main [data-pg-etichetta]").filter({ visible: true }).first(), path).toHaveText(label);
      await capilettera(h1, BORDEAUX);
      await expect(page.locator('main [data-divisore="stella"]').filter({ visible: true }).first(), path).toBeVisible();
      // Nothing of the style in the rows, the search box or the filters.
      await expect(page.locator("main li.catalog-row [class*='pg-'], [data-list-search-box] [class*='pg-'], main li.catalog-row[class*='pg-']"), path).toHaveCount(0);
    }
    await context.close();
  });

  test(`${name}: Compendio tiles with corners, «PRESTO» on Talenti and on its «in costruzione» page, no «I miei personaggi»`, async ({ browser }) => {
    const { context, page } = await newPage(browser, device);
    await page.goto("/compendio");
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toHaveText("Compendio");
    await capilettera(h1, BORDEAUX);
    await expect(page.locator("main [data-pg-etichetta]")).toHaveText("Regole, equipaggiamento e personaggi · SRD 5.2.1");
    await expect(page.locator('main [data-divisore="stella"]')).toBeVisible();
    const tiles = page.locator("main li[data-tile] > a");
    expect(await tiles.count()).toBeGreaterThanOrEqual(6);
    for (const tile of await tiles.all()) {
      await expect(tile).toHaveClass(/pg-tessera/);
      expect(await corners(tile)).toBe(4);
      expect(await tile.evaluate(a => getComputedStyle(a).boxShadow)).toContain("rgba(60, 40, 20");
    }
    const talenti = page.locator("main li[data-soon]").filter({ hasText: "Talenti" });
    await expect(talenti.locator("[data-timbro-presto]")).toHaveText("Presto");
    await expect(talenti.locator("[data-timbro-presto]")).toHaveCSS("color", BORDEAUX);
    expect(await talenti.locator("[data-timbro-presto]").evaluate(el => getComputedStyle(el).transform)).not.toBe("none");
    await expect(talenti).not.toContainText("In arrivo");
    await expect(talenti.locator("a")).toHaveClass(/pg-tessera-presto/);
    // «I miei personaggi» is hidden: no tile and no link for the public.
    await expect(page.locator('a[href="/personaggi"]')).toHaveCount(0);
    await expect(page.locator("main [data-beta-label]")).toHaveCount(0);
    await talenti.locator("a").click();
    await expect(page).toHaveURL(/\/in-arrivo\/talenti$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sezione momentaneamente in costruzione");
    const place = page.locator("[data-soon-pill]");
    await expect(place).toHaveText("Talenti Presto");
    // Under the icon, above the title.
    const icon = await page.locator("main svg").first().boundingBox();
    expect((await place.boundingBox()).y).toBeGreaterThan(icon.y + icon.height - 1);
    expect((await place.boundingBox()).y).toBeLessThan((await page.getByRole("heading", { level: 1 }).boundingBox()).y);
    await context.close();
  });
}

test("administrator: «I miei personaggi» on the Compendio with the BETA stamp; «In arrivo» stays a text label for them", async ({ browser }) => {
  test.setTimeout(120_000);
  const { context, page } = await newPage(browser, SCREENS[2][1]);
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
  await page.goto("/compendio");
  const tile = page.locator('main li[data-tile="/personaggi"]');
  await expect(tile).toContainText("I miei personaggi");
  await expect(tile.locator("[data-beta-label]")).toHaveText("BETA");
  await expect(tile).toContainText("Nascosta");
  expect(await corners(tile.locator("a"))).toBe(4);
  // Talenti «In arrivo»: the administrator sees the content and the state as text, as in /admin/sezioni.
  const talenti = page.locator('main li[data-tile="/talenti"]');
  await expect(talenti.locator("[data-soon-tag]")).toHaveText("In arrivo");
  await expect(talenti.locator("[data-timbro-presto]")).toHaveCount(0);
  // A feat sheet (seen by the administrator while the section is «In arrivo»).
  await page.goto("/talenti/allerta");
  const h1 = page.getByRole("heading", { level: 1 });
  await expect(h1).toHaveCount(1);
  await expect(page.locator("main [data-pg-etichetta]").first()).toHaveText("Talento · Origini");
  await capilettera(h1, BORDEAUX);
  await page.goto("/talenti");
  await expect(page.locator("main [data-pg-etichetta]").first()).toHaveText("Compendio · 2024");
  await capilettera(page.getByRole("heading", { level: 1 }), BORDEAUX);
  await context.close();
});
