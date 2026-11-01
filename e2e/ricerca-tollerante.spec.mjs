import { readFileSync } from "node:fs";
import { test, expect } from "./fixtures.mjs";
import ts from "typescript";
import { chooseEdition } from "./edition-pill.mjs";

// lib/fuzzy-search.ts and lib/search.ts as a plain script for the page: the search alone, timed in the browser.
function searchScript() {
  const plain = file => ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  return `(() => {
    const fuzzy = {}; (function (exports) { ${plain("lib/fuzzy-search.ts")} })(fuzzy);
    const search = {}; (function (exports, require) { ${plain("lib/search.ts")} })(search, () => fuzzy);
    window.__search = search;
  })();`;
}

// Search tolerant of typos (lib/fuzzy-search.ts) in the lists and in the Home, 2024 and 2014: «palla di foco» finds
// Palla di fuoco, «Forse cercavi» turns the search into the right name. Local test database only.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ }
  });
});

const didYouMean = page => page.locator("[data-did-you-mean]").filter({ visible: true });

test("lists: «palla di foco» finds Palla di fuoco in 2024 and 2014, «Forse cercavi» fixes the search; creatures too", async ({ page }) => {
  test.setTimeout(180_000);
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto("/grimorio");
  const search = page.getByRole("searchbox", { name: "Cerca un incantesimo" });
  for (const [edition, href] of [["2024", "/spell/palla-di-fuoco"], ["2014", "/spell/palla-di-fuoco-2014"]]) {
    await chooseEdition(page, edition);
    for (const query of ["palla di foco", "plla di fuoco", "PALLA DI FOUCO"]) {
      await search.fill(query);
      await expect(page.locator(`main a[href="${href}"]`).filter({ hasText: /^Palla di fuoco/ }), `${edition} ${query}`).toBeVisible();
      await expect(didYouMean(page)).toHaveText("Forse cercavi: Palla di fuoco");
      await expect(page.locator("[data-similar-results]").filter({ visible: true })).toHaveCount(1);
    }
    await didYouMean(page).getByRole("button", { name: "Palla di fuoco" }).click();
    await expect(search).toHaveValue("Palla di fuoco");
    await expect(didYouMean(page)).toHaveCount(0);
    await expect(page.locator(`main a[href="${href}"]`).filter({ hasText: /^Palla di fuoco/ })).toBeVisible();
    // An exact search never shows the suggestion; «dardo incantao» (one typo) still finds the spell.
    await search.fill("dardo incantao");
    await expect(page.locator("main a[href^='/spell/dardo-incantato']").first()).toBeVisible();
  }
  await page.goto("/bestiario");
  const creature = page.getByRole("searchbox", { name: "Cerca una creatura" });
  await creature.fill("goblinn");
  await expect(page.locator("main a[href^='/mostro/goblin']").first()).toBeVisible();
  await expect(didYouMean(page)).toContainText(/^Forse cercavi: Goblin/);
  await creature.fill("goblin");
  await expect(didYouMean(page)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Home: «palla di foco» in the search of the whole Grimorio, 2024 and 2014, with «Forse cercavi»", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  for (const [edition, href] of [["2024", "/spell/palla-di-fuoco"], ["2014", "/spell/palla-di-fuoco-2014"]]) {
    await page.addInitScript(value => { try { window.localStorage.setItem("grimorio.edizione", value); } catch { /* no storage */ } }, edition);
    await page.goto("/?cerca=palla%20di%20foco");
    const dialog = page.getByRole("dialog", { name: "Cerca in tutto il Grimorio" });
    await expect(dialog.getByRole("searchbox")).toHaveAttribute("placeholder", `Cerca nel Grimorio ${edition}…`);
    await expect(dialog.locator(`a[href="${href}"]`)).toBeVisible();
    await expect(didYouMean(page)).toHaveText("Forse cercavi: Palla di fuoco");
    await didYouMean(page).getByRole("button").click();
    await expect(dialog.getByRole("searchbox")).toHaveValue("Palla di fuoco");
    await expect(didYouMean(page)).toHaveCount(0);
    // The exact name is highlighted again.
    await expect(dialog.locator(`a[href="${href}"] mark`)).toHaveText("Palla di fuoco");
  }
  expect(errors).toEqual([]);
});

test("«palla»: only the right names, in the Home («Tutto») and in the lists, 2024 and 2014; no similar ones mixed in", async ({ page }) => {
  test.setTimeout(120_000);
  const wrong = /Allarme|Interdizione alla morte|Parlare con|^Pala$/;
  for (const edition of ["2024", "2014"]) {
    await page.addInitScript(value => { try { window.localStorage.setItem("grimorio.edizione", value); } catch { /* no storage */ } }, edition);
    await page.goto("/?cerca=palla");
    const dialog = page.getByRole("dialog", { name: "Cerca in tutto il Grimorio" });
    await expect(dialog.getByRole("group", { name: "Sezioni" }).getByRole("button", { name: "Tutto" })).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.locator('a[href^="/spell/palla-di-fuoco"]').first()).toBeVisible();
    await page.waitForTimeout(600);
    const names = await dialog.locator("#search-results a").allInnerTexts();
    expect(names.filter(name => wrong.test(name.split("\n")[0].trim())), `${edition}: ${names.join(" · ")}`).toEqual([]);
    expect(names.some(name => /palle di fuoco/i.test(name)), "the plural counts as the right word").toBe(true);
    await expect(page.locator("[data-similar-results]")).toHaveCount(0);
    await expect(page.locator("[data-did-you-mean]")).toHaveCount(0);
    // While «palla di f…» is being typed: no similar names; after the pause, «Forse cercavi» for a typo.
    const field = dialog.getByRole("searchbox");
    await field.fill("palla di foco");
    await expect(page.locator("[data-did-you-mean]")).toHaveText("Forse cercavi: Palla di fuoco");
    await expect(page.locator("[data-similar-results]").filter({ visible: true })).toHaveCount(1);
    await page.goto("/grimorio");
    await page.getByRole("searchbox", { name: "Cerca un incantesimo" }).fill("palla");
    await expect(page.locator("main a[href^='/spell/palla-di-fuoco']").first()).toBeVisible();
    await page.waitForTimeout(600);
    const spells = await page.locator("main li[data-card-row] a, main ul li a").allInnerTexts();
    expect(spells.filter(name => wrong.test(name.trim())), spells.join(" · ")).toEqual([]);
    await expect(page.locator("[data-similar-results]")).toHaveCount(0);
    await page.goto("/bestiario");
    await page.getByRole("searchbox", { name: "Cerca una creatura" }).fill("gatto");
    await expect(page.locator("main a[href^='/mostro/gatto']").first()).toBeVisible();
    await page.waitForTimeout(600);
    await expect(page.locator("[data-similar-results]")).toHaveCount(0);
  }
});

test("time of one keystroke on the whole index, CPU slowed 4× (a phone): measured, not over 100 ms", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "CPU slow-down via Chrome DevTools only");
  test.setTimeout(120_000);
  const results = {};
  for (const [name, path, field] of [["Home (indice completo)", "/?cerca=", "Cerca nel Grimorio"], ["Lista incantesimi", "/grimorio", "Cerca un incantesimo"]]) {
    await page.goto(path);
    const input = page.getByRole("searchbox", { name: field }).or(page.getByRole("dialog", { name: "Cerca in tutto il Grimorio" }).getByRole("searchbox")).first();
    await expect(input).toBeVisible();
    if (path.startsWith("/?")) await expect(page.getByRole("dialog").getByRole("group", { name: "Sezioni" })).toBeVisible();
    // From the input event to after the next paint: the search, the render and the layout of the results.
    await page.evaluate(() => {
      window.__keys = [];
      document.addEventListener("input", () => {
        const start = performance.now();
        requestAnimationFrame(() => setTimeout(() => window.__keys.push(performance.now() - start)));
      }, true);
    });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await input.click();
    await input.pressSequentially("palla di foco", { delay: 120 });
    await page.waitForTimeout(500);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    const times = (await page.evaluate(() => window.__keys)).sort((a, b) => a - b);
    expect(times.length).toBe(13);
    results[name] = { median: +times[Math.floor(times.length / 2)].toFixed(1), worst: +times[times.length - 1].toFixed(1) };
    expect(results[name].median, name).toBeLessThan(100);
  }
  // The search alone (the same code as the Home), on the whole index of the site, both editions, CPU slowed 4×.
  await page.goto("/info");
  // Evaluated through DevTools: not an inline script, so the Content-Security-Policy of the site stays as it is.
  await page.evaluate(searchScript());
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const compute = await page.evaluate(async typed => {
    const { rowsOf, splitByEdition, search } = window.__search;
    const index = await (await fetch("/ricerca-indice.json")).json();
    const rows = splitByEdition(rowsOf(index), "2024");
    const times = [];
    for (let round = 0; round < 3; round++)
      for (let i = 1; i <= typed.length; i++) {
        const start = performance.now();
        search(index, rows.own, typed.slice(0, i));
        search(index, rows.other, typed.slice(0, i));
        times.push(performance.now() - start);
      }
    // The first round prepares the names (on the site this is done when the browser is idle, before typing).
    const first = times.slice(0, typed.length), warm = times.slice(typed.length).sort((a, b) => a - b);
    return { names: rows.own.length + rows.other.length, median: +warm[Math.floor(warm.length / 2)].toFixed(1), worst: +warm[warm.length - 1].toFixed(1), unpreparedFirstKey: +first[0].toFixed(1) };
  }, "palla di foco");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  results["Solo ricerca, indice completo"] = compute;
  expect(compute.names).toBeGreaterThan(1000);
  expect(compute.median, "the search alone, CPU 4×").toBeLessThan(16);
  console.log(`Keystroke, CPU 4×: ${JSON.stringify(results)}`);
  test.info().annotations.push({ type: "keystroke", description: JSON.stringify(results) });
});
