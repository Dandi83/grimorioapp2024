import { test, expect } from "@playwright/test";

// NO SRD cards: the box at the bottom (components/card-origin-box.tsx) in the place of the SRD source, and the
// «Sintesi originale» switch of the editor (lib/content-editions.ts). Original summaries: «Sintesi originale del
// Grimorio…»; other cards added by the administrator: «Scheda inserita dal Grimorio…»; SRD cards unchanged.
// Local test database only: the cards made here are deleted at the end.
const SHOTS = process.env.NO_SRD_SHOTS;
const SUMMARY = "Sintesi originale del Grimorio, scritta con parole nostre: non è il testo del manuale.";
const ADDED = "Scheda inserita dal Grimorio: non fa parte dell’SRD.";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
});

async function login(page) {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
}

async function visitor(browser, edition, width = 390) {
  const context = await browser.newContext({ viewport: { width, height: 844 } });
  await context.addInitScript(value => { try { localStorage.setItem("grimorio.edizione", value); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } }, edition);
  return context.newPage();
}

/** The box of the card as a visitor sees it, on the phone and on the computer. */
async function originBox(browser, path, edition, name) {
  const texts = [];
  for (const width of [390, 1280]) {
    const guest = await visitor(browser, edition, width);
    await guest.goto(path);
    await expect(guest.getByRole("heading", { level: 1 })).toBeVisible();
    const box = guest.getByRole("complementary", { name: "Provenienza della scheda" });
    texts.push(await box.count() ? (await box.innerText()).replace(/\s+/g, " ").trim() : "");
    if (await box.count()) {
      // No manual and no page for a card that is not in the SRD; the NO SRD pill stays for everyone.
      await expect(box).not.toContainText(/SRD 5\.|pagina|Fonte ufficiale/);
      await expect(guest.locator("[data-card-labels] [data-no-srd]")).toHaveText("NO SRD");
      await expect(guest.getByRole("complementary", { name: "Fonte della scheda" })).toHaveCount(0);
    }
    if (SHOTS && name) await guest.screenshot({ path: `${SHOTS}/${name}-${width}.png`, fullPage: true });
    await guest.context().close();
  }
  expect(texts[0], path).toBe(texts[1]);
  return texts[0];
}

test("NO SRD origin box and the «Sintesi originale» switch", async ({ page, browser }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 390, height: 844 });

  // Amicizia 2024, one of the 49 original summaries: the summary box, links to /fonti.
  expect(await originBox(browser, "/spell/amicizia", "2024", "amicizia-2024")).toBe(`${SUMMARY} Schede NO SRD · Attribuzione e licenza`);
  // Palla di fuoco, SRD: the SRD source as before, no NO SRD box.
  const guest = await visitor(browser, "2024");
  await guest.goto("/spell/palla-di-fuoco");
  await expect(guest.locator("main aside", { hasText: "Testo integrale: SRD 5.2.1 italiano" })).toBeVisible();
  await expect(guest.locator("[data-card-origin]")).toHaveCount(0);
  await guest.context().close();

  await login(page);
  // A 2014 spell added here, switch off (the default).
  await page.goto("/admin/edizione?valore=2014&poi=%2Fadmin%2Fincantesimi");
  await page.getByRole("button", { name: "Nuovo", exact: true }).click();
  let editor = page.getByRole("dialog");
  const toggle = editor.getByRole("switch", { name: "Sintesi originale" });
  await expect(toggle).not.toBeChecked();
  await editor.getByLabel("Nome *").fill("Lampo di prova");
  await editor.locator("#spell-level").selectOption("1");
  await editor.locator("#spell-school").selectOption({ label: "Invocazione" });
  await editor.getByRole("button", { name: "Anteprima" }).click();
  await expect(editor.locator("[data-card-source]")).toHaveText("Aggiunta da te");
  await expect(editor.locator('[data-card-origin="aggiunta"]')).toContainText(ADDED);
  await editor.getByRole("button", { name: "Crea nel catalogo" }).click();
  await expect(editor).toHaveCount(0);
  await page.getByPlaceholder("Cerca per nome o scuola…").fill("lampo di prova");
  let row = page.locator("main ul li[data-card-row]").filter({ hasText: "Lampo di prova" }).first();
  await expect(row.locator("[data-row-pill]")).toHaveText("Aggiunta da te");
  const spell = await row.locator('a[href^="/spell/"]').first().getAttribute("href");
  expect(await originBox(browser, spell, "2014", "aggiunta-spento-2014")).toBe(`${ADDED} Schede NO SRD`);

  // Switch on: summary box, admin label «Sintesi originale», «NO SRD» still public.
  await row.getByRole("button", { name: /Modifica/ }).first().click();
  editor = page.getByRole("dialog");
  await expect(editor.getByRole("switch", { name: "Sintesi originale" })).not.toBeChecked();
  await editor.getByText("Sintesi originale", { exact: true }).click();
  await expect(editor.getByRole("switch", { name: "Sintesi originale" })).toBeChecked();
  await editor.getByRole("button", { name: "Anteprima" }).click();
  await expect(editor.locator("[data-card-source]")).toHaveText("Sintesi originale");
  await editor.getByRole("button", { name: /Salva/ }).click();
  await expect(editor).toHaveCount(0);
  row = page.locator("main ul li[data-card-row]").filter({ hasText: "Lampo di prova" }).first();
  await expect(row.locator("[data-row-pill]")).toHaveText("Sintesi");
  expect(await originBox(browser, spell, "2014", "aggiunta-acceso-2014")).toBe(`${SUMMARY} Schede NO SRD · Attribuzione e licenza`);
  await page.goto(spell);
  await expect(page.locator("[data-card-source]")).toHaveText("Sintesi originale");
  // The editor reopened keeps the switch on.
  await page.goto("/admin/edizione?valore=2014&poi=%2Fadmin%2Fincantesimi");
  await page.getByPlaceholder("Cerca per nome o scuola…").fill("lampo di prova");
  await page.locator("main ul li[data-card-row]").filter({ hasText: "Lampo di prova" }).first().getByRole("button", { name: /Modifica/ }).first().click();
  await expect(page.getByRole("dialog").getByRole("switch", { name: "Sintesi originale" })).toBeChecked();
  await page.getByRole("button", { name: "Chiudi editor" }).click();

  // The 49 summaries: fixed in the editor, no switch.
  await page.goto("/admin/edizione?valore=2024&poi=%2Fadmin%2Fincantesimi");
  await page.getByPlaceholder("Cerca per nome o scuola…").fill("amicizia");
  await page.locator("main ul li[data-card-row]").filter({ hasText: /^.*Amicizia(?! con)/ }).first().getByRole("button", { name: /Modifica/ }).first().click();
  await expect(page.getByRole("dialog").getByTestId("summary-fixed")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("switch")).toHaveCount(0);
  await page.getByRole("button", { name: "Chiudi editor" }).click();

  // Beholder, a creature added here: the added box; an SRD creature has no switch.
  await page.goto("/admin/edizione?valore=2024&poi=%2Fadmin%2Fmostri");
  await page.getByRole("button", { name: "Nuovo", exact: true }).click();
  await page.getByRole("dialog", { name: "Nuova creatura" }).getByRole("button", { name: "Scheda", exact: true }).click();
  editor = page.getByRole("dialog");
  await expect(editor.getByRole("switch", { name: "Sintesi originale" })).not.toBeChecked();
  await editor.locator("#nome").fill("Beholder");
  await editor.getByRole("button", { name: "Crea nel catalogo" }).click();
  await expect(editor).toHaveCount(0);
  await page.getByPlaceholder("Cerca per nome o tipo…").fill("beholder");
  const beholder = await page.locator("main ul li[data-card-row]").filter({ hasText: "Beholder" }).first().locator('a[href^="/mostro/"]').first().getAttribute("href");
  expect(await originBox(browser, beholder, "2024", "beholder-2024")).toBe(`${ADDED} Schede NO SRD`);
  await page.getByPlaceholder("Cerca per nome o tipo…").fill("lich");
  await page.locator("main ul li[data-card-row]").filter({ hasText: /^.*Lich/ }).first().getByRole("button", { name: /Modifica/ }).first().click();
  await expect(page.getByRole("dialog").getByRole("switch")).toHaveCount(0);
  await page.getByRole("button", { name: "Chiudi editor" }).click();

  // Clean up.
  await page.getByPlaceholder("Cerca per nome o tipo…").fill("beholder");
  page.once("dialog", dialog => dialog.accept());
  await page.locator("main ul li[data-card-row]").filter({ hasText: "Beholder" }).dispatchEvent("contextmenu");
  await page.locator("[data-row-menu]").getByRole("button", { name: "Elimina" }).click();
  await expect(page.locator("main ul li[data-card-row]").filter({ hasText: "Beholder" })).toHaveCount(0);
  await page.goto("/admin/edizione?valore=2014&poi=%2Fadmin%2Fincantesimi");
  await page.getByPlaceholder("Cerca per nome o scuola…").fill("lampo di prova");
  page.once("dialog", dialog => dialog.accept());
  await page.locator("main ul li[data-card-row]").filter({ hasText: "Lampo di prova" }).first().dispatchEvent("contextmenu");
  await page.locator("[data-row-menu]").getByRole("button", { name: "Elimina" }).click();
  await expect(page.locator("main ul li[data-card-row]").filter({ hasText: "Lampo di prova" })).toHaveCount(0);
  await page.goto("/admin/edizione?valore=2024&poi=%2Fadmin");
});
