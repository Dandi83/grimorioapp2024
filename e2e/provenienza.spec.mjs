import { test, expect } from "@playwright/test";

// «Provenienza» in the filters of Incantesimi and Bestiario, for the administrator only (same scheme as the «*»:
// after /api/admin/sessione, data from /api/admin/no-srd); the same filter in the lists of the reserved area.
// Visitors: no group, no call to the endpoint, no provenance in the answers. Local test database only: the
// cards made here are deleted at the end.
const ADDED = "Prova provenienza aggiunta";
const SUMMARY = "Prova provenienza sintesi";
const CREATURE = "Prova provenienza creatura";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
});
const edition = (page, value) => page.addInitScript(v => { try { localStorage.setItem("grimorio.edizione", v); } catch { /* no storage */ } }, value);
const shownCount = async page => Number((await page.getByRole("button", { name: /^Mostra \d+ risultat/ }).innerText()).match(/\d+/)[0]);

async function login(page) {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
}

/** Opens the filters of the list and picks a provenance; returns the count of the «Mostra» button. */
async function pick(page, label) {
  const sheet = page.getByRole("dialog");
  await sheet.locator("[data-provenance-filter]").getByRole("button", { name: label, exact: true }).click();
  await expect(sheet.locator("[data-provenance-filter]").getByRole("button", { name: label, exact: true })).toHaveAttribute("aria-pressed", "true");
  return shownCount(page);
}
/** The lists of the reserved area (components/admin-list/admin-list.tsx): counters, rows, «+», the menu of a row. */
const adminRows = page => page.locator("main li[data-card-row]");
const resultCount = async page => Number(await page.locator("[data-result-count]").getAttribute("data-result-count"));
/** «NO SRD» counter on, the number of rows, counter off again. */
async function adminNoSrd(page) {
  const counter = page.locator('[data-counter="nosrd"]');
  await counter.click();
  // The list is filtered after the click: its count is read once it shows the rows of the counter.
  await expect.poll(async () => (await resultCount(page)) === Number((await counter.innerText()).match(/\d+/)[0])).toBe(true);
  const count = await resultCount(page);
  await counter.click();
  return count;
}
const pillCount = (page, pill) => page.locator(`main li[data-card-row] [data-row-pill="${pill}"]`).count();
/** Deletes a card added here from the menu of its row (a long press on a phone). */
async function deleteFromList(page, list, name) {
  await page.getByRole("searchbox", { name: `Cerca in ${list}` }).fill(name);
  const row = adminRows(page).filter({ hasText: name });
  await row.dispatchEvent("contextmenu");
  page.once("dialog", dialog => dialog.accept());
  await page.locator("[data-row-menu]").getByRole("button", { name: "Elimina" }).click();
  await expect(row).toHaveCount(0);
}

async function openFilters(page, path) {
  await page.goto(path);
  await page.locator("li.catalog-row").first().waitFor();
  await page.getByRole("button", { name: /^Filtri/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test("Provenienza: visitors never see it; the administrator filters SRD / NO SRD / summaries / added, lists of the site and of the reserved area", async ({ page, browser }) => {
  test.setTimeout(300_000);
  // Visitors (phone and computer, both editions): the filter sheet as today, the endpoint never asked.
  for (const width of [390, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const guest = await context.newPage();
    const answers = [];
    guest.on("request", request => { if (request.url().includes("/api/admin/no-srd")) answers.push("ASKED"); });
    guest.on("response", async response => { if (/\/api\/catalogo\//.test(response.url())) answers.push(await response.text().catch(() => "")); });
    for (const value of ["2024", "2014"]) {
      await context.addInitScript(v => { try { localStorage.setItem("grimorio.edizione", v); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } }, value);
      for (const path of ["/grimorio", "/bestiario"]) {
        await openFilters(guest, path);
        await guest.waitForTimeout(600);
        await expect(guest.getByRole("dialog").getByText("Provenienza", { exact: true }), `${path} ${value} ${width}`).toHaveCount(0);
        await expect(guest.locator("[data-provenance-filter]")).toHaveCount(0);
        await guest.keyboard.press("Escape");
      }
    }
    expect(answers.includes("ASKED"), "a visitor never asks for the provenance").toBe(false);
    for (const body of answers) expect(body).not.toMatch(/fonte_scheda|Aggiunta da te|Sintesi originale|sintesi/);
    await context.close();
  }

  // Administrator: a 2014 spell added (switch off), one with «Sintesi originale» on, a 2024 creature added.
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.goto("/admin/edizione?valore=2014&poi=%2Fadmin%2Fincantesimi");
  // What the lists hold before (other tests of the run may have left cards): the checks are on the difference.
  // Summaries and added cards are told apart by the pill of their row.
  const base2014 = { nosrd: await adminNoSrd(page), sintesi: await pillCount(page, "Sintesi"), aggiunte: await pillCount(page, "Aggiunta da te") };
  for (const [name, summary] of [[ADDED, false], [SUMMARY, true]]) {
    await page.locator("[data-create-button]").click();
    const editor = page.getByRole("dialog");
    await editor.getByLabel("Nome *").fill(name);
    await editor.locator("#spell-level").selectOption("1");
    await editor.locator("#spell-school").selectOption({ label: "Ammaliamento" });
    if (summary) await editor.getByText("Sintesi originale", { exact: true }).click();
    await editor.getByRole("button", { name: "Crea nel catalogo" }).click();
    await expect(editor).toHaveCount(0);
  }
  // The list of the reserved area: the NO SRD counter, the pills of the rows.
  // A new card reaches the list after the save has refreshed it.
  await expect.poll(() => adminNoSrd(page)).toBe(base2014.nosrd + 2);
  await page.getByRole("searchbox", { name: "Cerca in Incantesimi" }).fill("prova provenienza");
  await expect(adminRows(page).filter({ hasText: SUMMARY }).locator('[data-row-pill="Sintesi"]')).toHaveCount(1);
  await expect(adminRows(page).filter({ hasText: ADDED }).locator('[data-row-pill="Aggiunta da te"]')).toHaveCount(1);
  await page.getByRole("searchbox", { name: "Cerca in Incantesimi" }).fill("");
  await page.goto("/admin/edizione?valore=2024&poi=%2Fadmin%2Fmostri");
  const base2024Monsters = await adminNoSrd(page);
  // In the reserved area the published homebrew creatures are NO SRD too; the site lists them under «Homebrew».
  const homebrew2024 = await page.locator('main ul li[data-card-row]:has([data-row-pill="Homebrew"])').count();
  await page.locator("[data-create-button]").click();
  await page.getByRole("dialog", { name: "Nuova creatura" }).getByRole("button", { name: "Scheda", exact: true }).click();
  await page.getByRole("dialog").locator("#nome").fill(CREATURE);
  await page.getByRole("dialog").getByRole("button", { name: "Crea nel catalogo" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect.poll(() => adminNoSrd(page)).toBe(base2024Monsters + 1);
  await page.goto("/admin/edizione?valore=2024&poi=%2Fadmin%2Fincantesimi");
  // «SRD modificate»: SRD cards that no longer match their record (the test database has some), NO SRD too.
  const modifiedAdmin = Number((await page.locator('[data-counter="modificate"]').innerText()).match(/\d+/)[0]);
  await expect.poll(() => adminNoSrd(page)).toBe(49 + modifiedAdmin);

  // Lists of the site, 2024: the 49 original summaries; SRD = the rest.
  await edition(page, "2024");
  await openFilters(page, "/grimorio");
  const all2024 = await shownCount(page);
  // «SRD modificate» (SRD cards that no longer match their record) count as NO SRD too.
  const modified2024 = await pick(page, "SRD modificate");
  expect(modified2024, "the same SRD modificate in the site and in the reserved area").toBe(modifiedAdmin);
  expect(await pick(page, "Solo NO SRD")).toBe(49 + modified2024);
  expect(await pick(page, "Sintesi originali")).toBe(49);
  expect(await pick(page, "Aggiunte da me")).toBe(0);
  expect(await pick(page, "Solo SRD")).toBe(all2024 - 49 - modified2024);
  // Applied: the chip, the rows, then removed with the chip.
  await pick(page, "Solo NO SRD");
  await page.getByRole("button", { name: /^Mostra \d+ risultat/ }).click();
  await expect(page.getByRole("status").filter({ hasText: /risultat/ }).first()).toHaveText(`${49 + modified2024} risultati`);
  await expect(page.getByRole("button", { name: /Solo NO SRD/ })).toBeVisible();
  // 2014: two NO SRD cards; with a class filter (the cards made here have no class) NO SRD gives none.
  await edition(page, "2014");
  await openFilters(page, "/grimorio");
  const all2014 = await shownCount(page);
  expect(await pick(page, "Solo NO SRD")).toBe(base2014.nosrd + 2);
  expect(await pick(page, "Sintesi originali")).toBe(base2014.sintesi + 1);
  expect(await pick(page, "Aggiunte da me")).toBe(base2014.aggiunte + 1);
  expect(await pick(page, "Solo SRD")).toBe(all2014 - base2014.nosrd - 2);
  await page.getByRole("dialog").getByRole("button", { name: "Mago", exact: true }).click();
  const srdMago = await shownCount(page);
  expect(srdMago).toBeGreaterThan(0);
  expect(await pick(page, "Tutte")).toBe(srdMago);
  expect(await pick(page, "Solo NO SRD")).toBe(0);
  await page.keyboard.press("Escape");
  // (the cards made here have no class: Mago + NO SRD has none of them)
  // Bestiario 2024 and the computer list next to a card.
  await edition(page, "2024");
  await openFilters(page, "/bestiario");
  expect(await pick(page, "Solo NO SRD")).toBe(base2024Monsters - homebrew2024 + 1);
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/spell/amicizia");
  await page.getByRole("button", { name: /^Filtri/ }).click();
  expect(await pick(page, "Solo NO SRD")).toBe(49 + modified2024);
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });

  // Clean up, then «Esci»: the group is gone and the list is «Tutte» again.
  await page.goto("/admin/edizione?valore=2024&poi=%2Fadmin%2Fmostri");
  await deleteFromList(page, "Mostri", CREATURE);
  await page.goto("/admin/edizione?valore=2014&poi=%2Fadmin%2Fincantesimi");
  for (const name of [ADDED, SUMMARY]) await deleteFromList(page, "Incantesimi", name);
  await page.goto("/admin");
  await page.getByRole("button", { name: "Esci", exact: true }).click();
  await expect(page.getByLabel("Passcode")).toBeVisible();
  await edition(page, "2024");
  await openFilters(page, "/grimorio");
  await page.waitForTimeout(600);
  await expect(page.locator("[data-provenance-filter]")).toHaveCount(0);
  expect(await shownCount(page)).toBe(all2024);
  await page.goto("/admin/edizione?valore=2024&poi=%2Fadmin");
});
