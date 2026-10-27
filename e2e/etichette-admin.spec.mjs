import { test, expect } from "@playwright/test";

// «Aggiunta da te» and «Sintesi originale» are for the administrator only: drawn in the browser after
// /api/admin/sessione, like «Modifica»; never in the page or the data served to visitors (lists, search,
// favorites, sheet, desktop column). The reserved area keeps them. Local test database only: the cards made
// here («Amicizia» 2014 and «Beholder», added by the administrator as in production) are deleted at the end.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ }
  });
});

const SHOTS = process.env.ETICHETTE_SHOTS;
const ADMIN_ONLY = /Aggiunta da te/;

async function login(page) {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
}

/** A visitor: separate context, no admin session, the edition of the card chosen. */
async function visitor(browser, edition, width = 390) {
  const context = await browser.newContext({ viewport: { width, height: 844 } });
  await context.addInitScript(value => { try { window.localStorage.setItem("grimorio.edizione", value); window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } }, edition);
  return context.newPage();
}

/** The HTML of the page and its data for the browser (RSC), as served to a visitor. */
async function served(request, path) {
  const html = await (await request.get(path)).text();
  const rsc = await (await request.get(path, { headers: { RSC: "1" } })).text();
  return html + rsc;
}

test("admin-only labels: visitors never get «Aggiunta da te» or «Sintesi originale», the administrator sees them until «Esci»", async ({ page, browser, request }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.goto("/admin/edizione?valore=2014&poi=%2Fadmin%2Fincantesimi");
  await page.getByRole("button", { name: "Nuovo", exact: true }).click();
  let editor = page.getByRole("dialog");
  await editor.getByLabel("Nome *").fill("Amicizia");
  await editor.locator("#spell-level").selectOption("0");
  await editor.locator("#spell-school").selectOption({ label: "Ammaliamento" });
  // The preview of the reserved area keeps the label.
  await editor.getByRole("button", { name: "Anteprima" }).click();
  await expect(editor.locator("[data-card-source]")).toHaveText("Aggiunta da te");
  await editor.getByRole("button", { name: "Crea nel catalogo" }).click();
  await expect(editor).toHaveCount(0);
  await page.getByPlaceholder("Cerca per nome o scuola…").fill("amicizia");
  const row = page.locator("main ul li[data-card-row]").filter({ hasText: /Amicizia(?! con)/ }).first();
  await expect(row.locator("[data-row-pill]")).toHaveText("Aggiunta da te");
  const amicizia = await row.locator('a[href^="/spell/"]').first().getAttribute("href");
  await page.goto("/admin/edizione?valore=2024&poi=%2Fadmin%2Fmostri");
  await page.getByRole("button", { name: "Nuovo", exact: true }).click();
  await page.getByRole("dialog", { name: "Nuova creatura" }).getByRole("button", { name: "Scheda", exact: true }).click();
  editor = page.getByRole("dialog");
  await editor.locator("#nome").fill("Beholder");
  await editor.getByRole("button", { name: "Crea nel catalogo" }).click();
  await expect(editor).toHaveCount(0);
  await page.getByPlaceholder("Cerca per nome o tipo…").fill("beholder");
  const beholder = await page.locator("main ul li[data-card-row]").filter({ hasText: "Beholder" }).first().locator('a[href^="/mostro/"]').first().getAttribute("href");

  // Visitor: not on the page, not in the HTML or the data served; «NO SRD» instead.
  for (const [path, edition, name] of [[amicizia, "2014", "amicizia-2014"], [beholder, "2024", "beholder"]]) {
    const guest = await visitor(browser, edition);
    await guest.goto(path);
    await expect(guest.getByRole("heading", { level: 1 })).toBeVisible();
    await guest.waitForTimeout(800);
    await expect(guest.locator("main")).not.toContainText(ADMIN_ONLY);
    await expect(guest.locator("[data-card-source]")).toHaveCount(0);
    // «NO SRD» for everyone, the same pill as the added subclasses.
    await expect(guest.locator("[data-card-labels] [data-no-srd]")).toHaveText("NO SRD");
    expect(await guest.content(), path).not.toMatch(ADMIN_ONLY);
    if (SHOTS) await guest.screenshot({ path: `${SHOTS}/${name}-visitatore-390.png`, fullPage: true });
    await guest.context().close();
    expect(await served(request, path), path).not.toMatch(ADMIN_ONLY);
  }
  const guest = await visitor(browser, "2014");
  // An original summary: «NO SRD», no asterisk and no note any more, no «Sintesi originale» pill; SRD cards keep theirs.
  await guest.goto("/spell/amicizia");
  await expect(guest.locator("h1 sup")).toHaveCount(0);
  await expect(guest.locator("main")).not.toContainText("Sintesi originale delle regole 2024");
  // A tap on «NO SRD» opens «Fonti e licenze» at its section; the SRD attributions are still there.
  await guest.locator("[data-card-labels] [data-no-srd]").click();
  await expect(guest).toHaveURL(/\/fonti#no-srd$/);
  await expect(guest.getByRole("heading", { name: "Schede NO SRD" })).toBeInViewport();
  await expect(guest.locator("#no-srd")).toContainText("Le schede con l’etichetta NO SRD sono state inserite dal Grimorio e non fanno parte del System Reference Document: non sono coperte dalla sua licenza CC-BY.");
  await expect(guest.getByText("Significato dell’asterisco")).toHaveCount(0);
  await expect(guest.locator("main")).toContainText("L’SRD 5.1 è concesso in licenza sotto l’Attribuzione 4.0 Internazionale di Creative Commons");
  await guest.goto("/spell/amicizia");
  await expect(guest.locator("[data-card-source]")).toHaveCount(0);
  await expect(guest.locator("[data-card-labels] [data-no-srd]")).toHaveText("NO SRD");
  expect(await served(request, "/spell/amicizia")).not.toMatch(/data-card-source/);
  await guest.goto("/spell/palla-di-fuoco");
  await expect(guest.locator("[data-card-source]")).toHaveText("SRD 5.2.1");
  await expect(guest.locator("[data-no-srd]")).toHaveCount(0);
  // Lists, search, favorites: never a source label.
  await guest.evaluate(ids => localStorage.setItem("grimorio.favorites.v1", JSON.stringify(ids)), [amicizia.split("/").pop(), `mostro:${beholder.split("/").pop()}`]);
  for (const path of ["/grimorio", "/bestiario", "/preferiti", "/?cerca=amicizia", "/?cerca=beholder"]) {
    await guest.goto(path);
    await guest.waitForTimeout(800);
    await expect(guest.locator("body"), path).not.toContainText(ADMIN_ONLY);
    await expect(guest.locator("[data-card-source]"), path).toHaveCount(0);
    // Lists and search: no label, «NO SRD» included (only in the sheets).
    await expect(guest.locator("[data-no-srd]"), path).toHaveCount(0);
  }
  await guest.context().close();
  // The desktop column.
  const wide = await visitor(browser, "2014", 1280);
  await wide.goto(amicizia);
  await expect(wide.getByRole("heading", { level: 1 })).toBeVisible();
  await wide.waitForTimeout(800);
  await expect(wide.locator("body")).not.toContainText(ADMIN_ONLY);
  await wide.context().close();

  // Administrator: drawn after the session check, on the sheet and on the summaries.
  await page.evaluate(() => localStorage.setItem("grimorio.edizione", "2014"));
  await page.goto(amicizia);
  await expect(page.locator("[data-card-source]")).toHaveText("Aggiunta da te");
  await expect(page.locator("[data-card-labels] [data-no-srd]")).toHaveText("NO SRD");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/amicizia-2014-admin-390.png`, fullPage: true });
  await page.goto(beholder);
  await expect(page.locator("[data-card-source]")).toHaveText("Aggiunta da te");
  await page.goto("/spell/amicizia");
  await expect(page.locator("[data-card-source]")).toHaveText("Sintesi originale");

  // Clean up, then «Esci»: the label goes with the session.
  await page.goto("/admin/edizione?valore=2014&poi=%2Fadmin%2Fincantesimi");
  await page.getByPlaceholder("Cerca per nome o scuola…").fill("amicizia");
  await expect(page.locator("main ul li[data-card-row]").filter({ hasText: /Amicizia(?! con)/ }).first().locator("[data-row-pill]")).toHaveText("Aggiunta da te");
  await page.goto("/admin/edizione?valore=2024&poi=%2Fadmin%2Fmostri");
  await page.getByPlaceholder("Cerca per nome o tipo…").fill("beholder");
  page.once("dialog", dialog => dialog.accept());
  await page.locator("main ul li[data-card-row]").filter({ hasText: "Beholder" }).dispatchEvent("contextmenu");
  await page.locator("[data-row-menu]").getByRole("button", { name: "Elimina" }).click();
  await expect(page.locator("main ul li[data-card-row]").filter({ hasText: "Beholder" })).toHaveCount(0);
  await page.getByRole("button", { name: "Esci", exact: true }).click();
  await expect(page.getByLabel("Passcode")).toBeVisible();
  await page.goto(amicizia);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForTimeout(800);
  await expect(page.locator("[data-card-source]")).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText(ADMIN_ONLY);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/amicizia-2014-dopo-esci-390.png`, fullPage: true });

  // The spell made here, removed with a new session.
  await login(page);
  await page.goto("/admin/edizione?valore=2014&poi=%2Fadmin%2Fincantesimi");
  await page.getByPlaceholder("Cerca per nome o scuola…").fill("amicizia");
  page.once("dialog", dialog => dialog.accept());
  await page.locator("main ul li[data-card-row]").filter({ hasText: /Amicizia(?! con)/ }).first().dispatchEvent("contextmenu");
  await page.locator("[data-row-menu]").getByRole("button", { name: "Elimina" }).click();
  await expect(page.locator("main ul li[data-card-row]").filter({ hasText: /Amicizia(?! con)/ })).toHaveCount(0);
  await page.goto("/admin/edizione?valore=2024&poi=%2Fadmin");
});
