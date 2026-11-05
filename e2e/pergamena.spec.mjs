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
