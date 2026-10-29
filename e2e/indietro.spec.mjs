import { test, expect } from "@playwright/test";

// «Modifica» and «indietro»: leaving an editor opened from a public page never leaves the editor in the
// history (lib/admin-edit-return.ts), so «indietro» on the card leads to its list, with its search and scroll,
// and never into the admin area (components/back-button.tsx). Local test database only.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5));
      if (!window.localStorage.getItem("grimorio.edizione")) window.localStorage.setItem("grimorio.edizione", "2024");
    } catch { /* no storage */ }
  });
});

async function login(page) {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
}
const edit = page => page.locator("[data-admin-edit]").first();
const back = page => page.getByRole("button", { name: "Torna indietro" });
const path = page => new URL(page.url()).pathname + new URL(page.url()).search;

/** The list of spells searched and scrolled, then the card of the spell opened from it. */
async function listThenCard(page, search, name) {
  await page.goto("/grimorio");
  const box = page.getByRole("searchbox").first();
  await box.fill(search);
  await expect(page.locator("li.catalog-row").first()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 120));
  const before = await page.evaluate(() => window.scrollY);
  await page.locator("li.catalog-row").filter({ hasText: name }).first().locator("a").first().click();
  await expect(page).toHaveURL(/\/spell\//);
  return before;
}
/** Back on the list: the search typed before is still there, and the scroll. */
async function expectList(page, search, scroll) {
  await expect(page).toHaveURL(/\/grimorio(\?|$)/);
  await expect(page.getByRole("searchbox").first()).toHaveValue(search);
  if (scroll) await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scroll - 40);
}

test("leaving the editor, «indietro» on the card leads to the list, never to the editor or the admin area", async ({ page }) => {
  test.setTimeout(300_000);
  const visited = [];
  page.on("framenavigated", frame => { if (frame === page.mainFrame()) visited.push(new URL(frame.url()).pathname); });
  await login(page);

  // Spells: «Torna alla scheda», X, «Chiudi editor» of the editor bar, the browser's back from the editor.
  for (const leave of [
    async () => page.getByRole("link", { name: "‹ Torna alla scheda" }).click(),
    async () => page.getByRole("dialog").getByRole("button", { name: "Chiudi editor" }).click(),
    async () => page.goBack(),
  ]) {
    const scroll = await listThenCard(page, "palla di fuoco", "Palla di fuoco");
    const card = path(page);
    await edit(page).click();
    await expect(page).toHaveURL(/\/admin\/incantesimi\/palla-di-fuoco/);
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Modifica incantesimo" })).toBeVisible();
    await leave();
    await expect(page).toHaveURL(new RegExp(`${card.replace(/[?]/g, "\\?")}$`));
    await back(page).click();
    await expectList(page, "palla di fuoco", scroll);
    // Once more «indietro» of the browser: before the list, never the editor.
    await page.goBack();
    expect(path(page)).not.toMatch(/^\/admin\/incantesimi\//);
    await page.goto("/");
  }

  // A save: back to the card with the new value, then «indietro» to the list.
  await page.goto("/admin/edizione?valore=2024&poi=%2Fadmin%2Fincantesimi");
  await page.getByRole("button", { name: "Nuovo", exact: true }).click();
  const creator = page.getByRole("dialog");
  await creator.getByLabel("Nome *").fill("Prova del ritorno");
  await creator.locator("#spell-level").selectOption("1");
  await creator.locator("#spell-school").selectOption({ index: 2 });
  await creator.locator("#gittata").selectOption("9 metri");
  await creator.getByRole("button", { name: "Crea nel catalogo" }).click();
  await expect(creator).toHaveCount(0);
  await page.goto("/");
  let scroll = await listThenCard(page, "prova del ritorno", "Prova del ritorno");
  const saved = path(page);
  await edit(page).click();
  const editor = page.getByRole("dialog");
  await editor.locator("#gittata").selectOption("18 metri");
  await editor.getByRole("button", { name: "Salva modifiche" }).click();
  await expect(page).toHaveURL(new RegExp(`${saved}$`));
  await expect(page.getByText("18 metri", { exact: true })).toBeVisible();
  await back(page).click();
  await expectList(page, "prova del ritorno", scroll);

  // No loop: card → Modifica → back to the card, three times, then «indietro» twice: the list, then before it.
  scroll = await listThenCard(page, "palla di fuoco", "Palla di fuoco");
  for (let round = 0; round < 3; round++) {
    await edit(page).click();
    await expect(page).toHaveURL(/\/admin\/incantesimi\//);
    await page.getByRole("link", { name: "‹ Torna alla scheda" }).click();
    await expect(page).toHaveURL(/\/spell\/palla-di-fuoco/);
  }
  await back(page).click();
  await expectList(page, "palla di fuoco", scroll);
  await page.goBack();
  expect(path(page)).not.toMatch(/^\/(admin|spell)\//);

  // An editor opened from its address: closing shows the card, «indietro» the list of the section.
  await page.goto("/admin/incantesimi/palla-di-fuoco?ritorno=%2Fspell%2Fpalla-di-fuoco");
  await page.getByRole("dialog").getByRole("button", { name: "Chiudi editor" }).click();
  await expect(page).toHaveURL(/\/spell\/palla-di-fuoco$/);
  await back(page).click();
  await expect(page).toHaveURL(/\/grimorio/);

  // A creature from the Bestiario and back.
  await page.goto("/bestiario");
  await page.getByRole("searchbox").first().fill("aboleth");
  await page.locator("li.catalog-row a").filter({ hasText: "Aboleth" }).first().click();
  await expect(page).toHaveURL(/\/mostro\/aboleth/);
  await edit(page).click();
  await expect(page).toHaveURL(/\/admin\/mostri\/aboleth/);
  await page.getByRole("link", { name: "‹ Torna alla scheda" }).click();
  await expect(page).toHaveURL(/\/mostro\/aboleth/);
  await back(page).click();
  await expect(page).toHaveURL(/\/bestiario/);
  await expect(page.getByRole("searchbox").first()).toHaveValue("aboleth");

  // A homebrew of the Grimorio: its guided editor, closed with X.
  await page.goto("/admin/mostri");
  await page.getByRole("button", { name: "Nuovo", exact: true }).click();
  await page.getByRole("dialog", { name: "Nuova creatura" }).getByRole("button", { name: "Creati da voi", exact: true }).click();
  const brew = page.getByRole("dialog");
  await brew.locator("#admin-hb-nome").fill("Ombra del ritorno");
  await brew.locator("#admin-hb-azioni-0-nome").fill("Tocco");
  await brew.locator("#admin-hb-azioni-0-testo").fill("Tiro per colpire in mischia: +4, portata 1,5 m. Colpito: 5 (1d6 + 2) danni necrotici.");
  await brew.getByRole("button", { name: "Salva" }).click();
  await expect(brew).toHaveCount(0);
  await page.goto("/bestiario");
  await page.getByRole("searchbox").first().fill("ombra del ritorno");
  await page.getByRole("button", { name: /^Filtri/ }).click();
  // «Creati da voi» leads to the section (switched off for the visitors: «Nascosta» for the administrator).
  await page.getByRole("button", { name: /^Creati da voi/ }).click();
  await page.getByRole("button", { name: /^Mostra \d+ risultat/ }).click();
  await expect(page).toHaveURL(/\/bestiario\/creati-da-voi$/);
  await page.locator('a[href="/mostro/homebrew-ombra-del-ritorno"]').first().click();
  await expect(page).toHaveURL(/\/mostro\/homebrew-ombra-del-ritorno/);
  await edit(page).click();
  await expect(page.getByRole("dialog", { name: "Modifica «Ombra del ritorno»" })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Chiudi editor" }).click();
  await expect(page).toHaveURL(/\/mostro\/homebrew-ombra-del-ritorno/);
  await back(page).click();
  await expect(page).toHaveURL(/\/bestiario/);

  // A weapon and a condition from their lists (/admin/contenuti): «Annulla», then «indietro» before the list.
  for (const [from, list, pencil] of [["/equipaggiamento", "/equipaggiamento/armi", "Modifica Ascia"], ["/compendio", "/compendio/condizioni", "Modifica Accecato"]]) {
    await page.goto(from);
    await page.locator(`a[href="${list}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${list}$`));
    await page.getByRole("link", { name: pencil, exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/contenuti\//);
    await page.getByRole("link", { name: "Annulla" }).click();
    await expect(page).toHaveURL(new RegExp(`${list}$`));
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${from}$`));
  }
  // A weapon saved from its list: back to the list with the new cost, then the original again.
  const cost = page.locator("li").filter({ has: page.getByRole("link", { name: "Modifica Ascia", exact: true }) });
  for (const [fill, reason] of [[async () => page.getByLabel("Costo", { exact: true }).fill("88 mo"), "Prova del ritorno (database di prova)."], [async () => page.getByRole("button", { name: "Ripristina originale" }).first().click(), "Ripristino dopo la prova."]]) {
    await page.goto("/equipaggiamento");
    await page.locator('a[href="/equipaggiamento/armi"]').first().click();
    await page.getByRole("link", { name: "Modifica Ascia", exact: true }).click();
    await fill();
    await page.getByLabel("Motivo della modifica (obbligatorio)").fill(reason);
    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: "Salva modifica" }).click();
    await expect(page).toHaveURL(/\/equipaggiamento\/armi$/);
    if (reason.startsWith("Prova")) await expect(cost).toContainText("88 mo");
    else await expect(cost).not.toContainText("88 mo");
    await page.goBack();
    await expect(page).toHaveURL(/\/equipaggiamento$/);
  }
  // The admin area was reached only by its own addresses and by «Modifica», never by «indietro» from a card.
  expect(visited.filter((step, index) => step.startsWith("/admin/") && /^\/(spell|mostro)\//.test(visited[index - 1] ?? "") && !/^\/admin\/(incantesimi|mostri|edizione)/.test(step))).toEqual([]);

  // Clean up: the spell and the homebrew.
  await page.goto("/admin/edizione?valore=2024&poi=%2Fadmin%2Fincantesimi");
  await page.getByPlaceholder("Cerca per nome o scuola…").fill("prova del ritorno");
  page.once("dialog", dialog => dialog.accept());
  await page.locator("main ul li[data-card-row]").filter({ hasText: "Prova del ritorno" }).dispatchEvent("contextmenu");
  await page.locator("[data-row-menu]").getByRole("button", { name: "Elimina" }).click();
  await expect(page.locator("main ul li[data-card-row]").filter({ hasText: "Prova del ritorno" })).toHaveCount(0);
  await page.goto("/admin/edizione?valore=2024&poi=%2Fadmin%2Fmostri");
  await page.getByPlaceholder("Cerca per nome o tipo…").fill("ombra del ritorno");
  page.once("dialog", dialog => dialog.accept());
  await page.locator("main ul li[data-card-row]").filter({ hasText: "Ombra del ritorno" }).dispatchEvent("contextmenu");
  await page.locator("[data-row-menu]").getByRole("button", { name: "Elimina" }).click();
  await expect(page.locator("main ul li[data-card-row]").filter({ hasText: "Ombra del ritorno" })).toHaveCount(0);
});
