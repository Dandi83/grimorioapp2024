import { test, expect } from "@playwright/test";

// PROMPT 35: the line «in inglese» marks the letters found, as the Italian name in the search of the Home; the English
// names of the equipment. The visitor at 390 and 1280, in 2024 and 2014. Local test database only.
async function visitor(browser, width, edition) {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: width < 600 ? 844 : 900 } });
  await context.addInitScript(value => {
    try {
      localStorage.setItem("grimorio.edizione", value);
      localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5));
    } catch { /* no storage */ }
  }, edition);
  return context;
}

const suffix = edition => (edition === "2014" ? "-2014" : "");
/** The English line of a result: its text and the part marked. */
const englishLine = (scope, href) => scope.locator(`a[href="${href}"] [data-in-inglese]`).filter({ visible: true }).first();

async function expectMarked(scope, href, text, marked) {
  const line = englishLine(scope, href);
  await expect(line).toHaveText(`in inglese: ${text}`);
  await expect(line.locator("mark")).toHaveText(marked);
  // The same style as the Italian name of the Home.
  await expect(line.locator("mark")).toHaveCSS("background-color", "rgb(246, 226, 168)");
  await expect(line.locator("mark")).toHaveCSS("font-weight", "700");
}

for (const width of [390, 1280]) for (const edition of ["2024", "2014"]) {
  test(`at ${width}, ${edition}: «fire», «longsword», «chain mail» marked in English; the Italian marks as before`, async ({ browser }) => {
    test.setTimeout(180_000);
    const context = await visitor(browser, width, edition);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(String(error)));
    const calls = [];
    page.on("request", request => { if (["fetch", "xhr"].includes(request.resourceType())) calls.push(new URL(request.url()).pathname); });

    // The Home: «fire» in Incantesimi, every result shown.
    await page.goto("/?cerca=fire&sezione=incantesimi");
    const dialog = page.getByRole("dialog", { name: "Cerca in tutto il Grimorio" });
    const more = dialog.getByRole("button", { name: /^Mostra tutti/ });
    await expect(dialog.locator("[data-in-inglese]").first()).toBeVisible();
    if (await more.count()) await more.first().click();
    await expectMarked(dialog, `/spell/dardo-di-fuoco${suffix(edition)}`, "Fire Bolt", "Fire");
    await expectMarked(dialog, `/spell/palla-di-fuoco${suffix(edition)}`, "Fireball", "Fire");
    await expectMarked(dialog, `/spell/luminescenza${suffix(edition)}`, "Faerie Fire", "Fire");
    // The Italian names found by the English one: nothing to mark in them.
    await expect(dialog.locator(`a[href="/spell/dardo-di-fuoco${suffix(edition)}"] > span > span`).first().locator("mark")).toHaveCount(0);

    // The equipment: weapons and armour found by the English name, in the Home.
    const field = dialog.getByRole("searchbox");
    await dialog.getByRole("group", { name: "Sezioni" }).getByRole("button", { name: "Tutto" }).click();
    await field.fill("longsword");
    await expectMarked(dialog, "/equipaggiamento/armi/spada-lunga", "Longsword", "Longsword");
    await expect(dialog.locator('a[href="/equipaggiamento/armi/spada-lunga"]')).toContainText("Spada lunga");
    await field.fill("chain mail");
    await expectMarked(dialog, "/equipaggiamento/armature/cotta-di-maglia", edition === "2024" ? "Chain Mail" : "Chain mail", edition === "2024" ? "Chain Mail" : "Chain mail");
    await field.fill("thieves");
    await expectMarked(dialog, "/equipaggiamento/strumenti/arnesi-da-scasso", edition === "2024" ? "Thieves’ Tools" : "Thieves’ tools", "Thieves");

    // The Italian name: marked as before, no English line when only the Italian name is found.
    await field.fill("palla");
    await expect(dialog.locator(`a[href="/spell/palla-di-fuoco${suffix(edition)}"] mark`).first()).toHaveText("Palla");
    await expect(dialog.locator(`a[href="/spell/palla-di-fuoco${suffix(edition)}"] [data-in-inglese]`)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (process.env.INGLESE_SHOTS) {
      await field.fill("fire");
      await page.screenshot({ path: `${process.env.INGLESE_SHOTS}/home-fire-${width}-${edition}.png` });
    }

    // The lists: Incantesimi and the tools.
    await page.goto("/grimorio");
    await page.getByRole("searchbox", { name: "Cerca un incantesimo" }).filter({ visible: true }).first().fill("fire");
    await expectMarked(page, `/spell/luminescenza${suffix(edition)}`, "Faerie Fire", "Fire");
    await expectMarked(page, `/spell/palla-di-fuoco${suffix(edition)}`, "Fireball", "Fire");
    await page.goto("/equipaggiamento/strumenti");
    await page.getByRole("searchbox").filter({ visible: true }).first().fill("tools");
    await expectMarked(page, "/equipaggiamento/strumenti/arnesi-da-scasso", edition === "2024" ? "Thieves’ Tools" : "Thieves’ tools", edition === "2024" ? "Tools" : "tools");
    await page.goto("/equipaggiamento/avventura");
    await page.getByRole("searchbox").filter({ visible: true }).first().fill("rope");
    await expect(page.locator("[data-in-inglese] mark").filter({ visible: true }).first()).toHaveText("Rope");
    if (process.env.INGLESE_SHOTS) await page.screenshot({ path: `${process.env.INGLESE_SHOTS}/avventura-rope-${width}-${edition}.png` });

    // No request more: besides the statistics, only the index and the pages prefetched by the links.
    // (The list column of the computer reads /api/catalogo, as before.)
    expect(calls.filter(path => path.startsWith("/api/") && path !== "/api/analytics" && !path.startsWith("/api/catalogo/")), calls.join(" ")).toEqual([]);
    expect(errors).toEqual([]);
    await context.close();
  });
}
