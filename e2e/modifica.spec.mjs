import { test, expect } from "@playwright/test";

// «Modifica» on the public pages for the administrator: never for visitors (nor in the server HTML),
// the editor of the card opened directly, back to the page after closing or saving. Local test database only.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5));
      if (!window.localStorage.getItem("grimorio.edizione")) window.localStorage.setItem("grimorio.edizione", "2024");
    } catch { /* no storage */ }
  });
});

const SHOTS = process.env.MODIFICA_SHOTS;
const PAGES = ["/spell/palla-di-fuoco", "/spell/aiuto-2014", "/mostro/orco-2014", "/mostro/aboleth", "/oggetti-magici/borsa-conservante", "/classi/mago",
  "/equipaggiamento/armi", "/equipaggiamento/armature", "/equipaggiamento/avventura", "/equipaggiamento/strumenti", "/compendio/condizioni", "/manuale/condizioni-accecato"];
const edit = page => page.locator("[data-admin-edit]");

async function login(page) {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
}

test("visitors: no «Modifica» anywhere, in the page or in its HTML, and the session is never asked", async ({ page, request }) => {
  const asked = [];
  page.on("request", item => { if (item.url().includes("/api/admin/sessione")) asked.push(item.url()); });
  for (const path of PAGES) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(300);
    await expect(edit(page), path).toHaveCount(0);
    const html = await (await request.get(path)).text();
    expect(html, path).not.toContain("data-admin-edit");
    expect(html, path).not.toContain("modifica=");
  }
  expect(asked).toEqual([]);
  // The editor addresses without the login: the passcode is asked.
  for (const path of ["/admin/incantesimi/palla-di-fuoco?ritorno=%2Fspell%2Fpalla-di-fuoco", "/admin/mostri/orco-2014", "/admin/incantesimi?modifica=palla-di-fuoco&ritorno=%2Fspell%2Fpalla-di-fuoco", "/admin/mostri?modifica=orco-2014", "/admin/contenuti/armi/ascia?edizione=2024&ritorno=%2Fequipaggiamento%2Farmi"]) {
    await page.goto(path);
    await expect(page.getByLabel("Passcode"), path).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  const edition = await request.get("/admin/edizione?valore=2014&poi=%2Fadmin%2Fincantesimi", { maxRedirects: 0 });
  expect(edition.status()).toBe(303);
  expect(edition.headers()["set-cookie"] ?? "").not.toContain("grimorio_admin_edizione");
});

test("administrator: «Modifica» opens the editor of the card and comes back; a save shows at once; gone after «Esci»", async ({ page, request }) => {
  test.setTimeout(240_000);
  await login(page);
  // A card added by the administrator and a homebrew, to remove at the end.
  await page.goto("/admin/mostri");
  await page.getByRole("button", { name: "Nuovo", exact: true }).click();
  await page.getByRole("dialog", { name: "Nuova creatura" }).getByRole("button", { name: "Scheda", exact: true }).click();
  let editor = page.getByRole("dialog");
  await editor.locator("#nome").fill("Scheda di prova Modifica");
  await editor.getByRole("button", { name: "Crea nel catalogo" }).click();
  await expect(editor).toHaveCount(0);
  await page.getByPlaceholder("Cerca per nome o tipo…").fill("scheda di prova modifica");
  const added = await page.locator("main ul li[data-card-row]").filter({ hasText: "Scheda di prova Modifica" }).first().getAttribute("data-public-href");
  await page.getByRole("button", { name: "Nuovo", exact: true }).click();
  await page.getByRole("dialog", { name: "Nuova creatura" }).getByRole("button", { name: "Nuovo mostro della redazione", exact: true }).click();
  editor = page.getByRole("dialog");
  await editor.locator("#admin-hb-nome").fill("Lupo di cenere");
  await editor.locator("#admin-hb-azioni-0-nome").fill("Morso");
  await editor.locator("#admin-hb-azioni-0-testo").fill("Attacco con arma da mischia: +4 al tiro per colpire, portata 1,5 m, un bersaglio. Colpito: 6 (1d8 + 2) danni perforanti.");
  await editor.getByRole("button", { name: "Salva" }).click();
  await expect(editor).toHaveCount(0);
  const brew = "/mostro/homebrew-lupo-di-cenere";
  await expect.poll(async () => (await page.request.get(brew)).status()).toBe(200);

  // The button: bordeaux, round, at least 48 px, at the bottom right above the bar; never in the HTML, even the administrator's.
  await page.goto("/spell/palla-di-fuoco");
  const button = edit(page);
  await expect(button).toHaveText("Modifica");
  await expect(button).toHaveCSS("position", "fixed");
  await expect(button).toHaveCSS("background-color", "rgb(122, 31, 43)");
  const box = await button.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(48);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  const nav = await page.getByRole("navigation", { name: "Navigazione principale" }).boundingBox();
  expect(box.y + box.height, "above the bottom bar").toBeLessThanOrEqual(nav.y);
  for (const name of [/Condividi/, /preferit/i]) {
    const other = await page.getByRole("button", { name }).first().boundingBox();
    if (other) expect(box.y > other.y + other.height || box.x > other.x + other.width || box.x + box.width < other.x, `does not cover ${name}`).toBeTruthy();
  }
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/scheda-incantesimo-390.png` });
  expect(await (await page.request.get("/spell/palla-di-fuoco")).text()).not.toContain("data-admin-edit");

  // Each card opens its editor on its edition; closing it comes back to the card.
  const roundTrip = async (path, check, close) => {
    await page.goto(path);
    await edit(page).first().click();
    await check();
    await close();
    await expect(page, path).toHaveURL(new RegExp(`${path.replace(/[?]/g, "\\?")}$`));
    await expect(edit(page).first()).toBeVisible();
  };
  const band = edition => expect(page.getByTestId("admin-edition-band")).toHaveText(edition);
  const closeDialog = async () => page.getByRole("dialog").getByRole("button", { name: "Chiudi editor" }).click();
  await roundTrip("/spell/palla-di-fuoco", async () => {
    await expect(page).toHaveURL(/\/admin\/incantesimi\/palla-di-fuoco\?(impostata=1&)?ritorno=%2Fspell%2Fpalla-di-fuoco$/);
    await band("2024");
    await expect(page.getByRole("dialog")).toContainText("Modifica incantesimo");
    await expect(page.getByRole("dialog").getByLabel("Nome *")).toHaveValue(/Palla di fuoco/i);
  }, closeDialog);
  await roundTrip("/spell/aiuto-2014", async () => { await band("2014"); await expect(page.getByRole("dialog").getByLabel("Nome *")).toHaveValue(/Aiuto/); }, closeDialog);
  await roundTrip("/mostro/orco-2014", async () => { await band("2014"); await expect(page.getByRole("dialog").locator("#nome")).toHaveValue("Orco"); }, closeDialog);
  await roundTrip(added, async () => { await band("2024"); await expect(page.getByRole("dialog").locator("#nome")).toHaveValue("Scheda di prova Modifica"); }, closeDialog);
  await roundTrip(brew, async () => { await expect(page.getByRole("dialog", { name: "Modifica «Lupo di cenere»" })).toBeVisible(); }, closeDialog);
  await roundTrip("/oggetti-magici/borsa-conservante", async () => {
    await expect(page).toHaveURL(/\/admin\/contenuti\/oggetti-magici\/borsa-conservante\?edizione=2024&ritorno=/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Borsa conservante");
  }, async () => page.getByRole("link", { name: "Annulla" }).click());
  await roundTrip("/classi/mago", async () => { await expect(page).toHaveURL(/\/admin\/contenuti\/classi\/mago\?edizione=2024/); }, async () => page.getByRole("link", { name: "Annulla" }).click());

  // Lists: a pencil next to each name.
  await page.goto("/equipaggiamento/armi");
  await expect(page.getByRole("link", { name: "Modifica Ascia", exact: true })).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/armi-390.png` });
  for (const [path, name, url] of [
    ["/equipaggiamento/armi", "Modifica Ascia", /\/admin\/contenuti\/armi\/ascia\?edizione=2024/],
    ["/compendio/condizioni", "Modifica Accecato", /\/admin\/contenuti\/condizioni\/condizioni-accecato\?edizione=2024/],
  ]) {
    await page.goto(path);
    await page.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(url);
    await page.getByRole("link", { name: "Annulla" }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
  for (const path of ["/equipaggiamento/armature", "/equipaggiamento/avventura", "/equipaggiamento/strumenti"]) {
    await page.goto(path);
    await expect(page.getByRole("link", { name: /^Modifica / }).first(), path).toBeVisible();
  }

  // A save from a public page: back to it, with the new value at once; then the original again.
  const saveAscia = async (fill, reason) => {
    await page.goto("/equipaggiamento/armi");
    await page.getByRole("link", { name: "Modifica Ascia", exact: true }).click();
    await fill();
    await page.getByLabel("Motivo della modifica (obbligatorio)").fill(reason);
    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: "Salva modifica" }).click();
    await expect(page).toHaveURL(/\/equipaggiamento\/armi$/);
  };
  const cost = page.locator("li").filter({ has: page.getByRole("link", { name: "Modifica Ascia", exact: true }) });
  await page.goto("/equipaggiamento/armi");
  const original = (await cost.textContent()).match(/\d+ mo/)[0];
  await saveAscia(async () => page.getByLabel("Costo", { exact: true }).fill("77 mo"), "Prova del pulsante Modifica (database di prova).");
  await expect(cost).toContainText("77 mo");
  await saveAscia(async () => page.getByRole("button", { name: "Ripristina originale" }).first().click(), "Ripristino dopo la prova.");
  await expect(cost).toContainText(original);
  // A spell saved from its card: the card shows it at once.
  await page.goto(added);
  await edit(page).click();
  await page.getByRole("dialog").locator("#nome").fill("Scheda di prova Modificata");
  await page.getByRole("dialog").getByRole("button", { name: "Salva modifiche" }).click();
  await expect(page).toHaveURL(new RegExp(`${added}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Scheda di prova Modificata");

  // Computer: the button next to the title of the creature, not floating.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/mostro/aboleth");
  await expect(edit(page)).toHaveCSS("position", "static");
  const title = await page.getByRole("heading", { level: 1, name: "Aboleth" }).boundingBox();
  const inline = await edit(page).boundingBox();
  expect(inline.y).toBeLessThan(title.y + title.height);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/scheda-mostro-1440.png` });
  await page.setViewportSize({ width: 390, height: 844 });

  // A return address outside the site is ignored: closing goes to the public card. Older ?modifica links go on to the editor page.
  await page.goto("/admin/incantesimi?modifica=palla-di-fuoco&ritorno=https%3A%2F%2Fevil.example%2F");
  await expect(page).toHaveURL(/\/admin\/incantesimi\/palla-di-fuoco(\?impostata=1)?$/);
  await closeDialog();
  await expect(page).toHaveURL(/\/spell\/palla-di-fuoco$/);
  await page.goto("/admin/mostri?modifica=orco-2014&ritorno=%2Fmostro%2Forco-2014");
  await expect(page).toHaveURL(/\/admin\/mostri\/orco-2014\?(impostata=1&)?ritorno=%2Fmostro%2Forco-2014$/);
  await page.goto("/admin/contenuti/armi/ascia?edizione=2024&ritorno=%2F%2Fevil.example");
  await expect(page.getByRole("link", { name: "Annulla" })).toHaveAttribute("href", "/admin/contenuti/armi");

  // Clean up: the card added and the homebrew (2024: the Orc above moved the admin area to 2014).
  await page.goto("/admin/edizione?valore=2024&poi=%2Fadmin%2Fmostri");
  for (const name of ["Scheda di prova Modificata", "Lupo di cenere"]) {
    await page.getByPlaceholder("Cerca per nome o tipo…").fill(name.toLowerCase());
    page.once("dialog", dialog => dialog.accept());
    await page.locator("main ul li[data-card-row]").filter({ hasText: name }).dispatchEvent("contextmenu");
    await page.locator("[data-row-menu]").getByRole("button", { name: "Elimina" }).click();
    await expect(page.locator("main ul li[data-card-row]").filter({ hasText: name })).toHaveCount(0);
  }

  // «Esci»: no button any more.
  await page.goto("/admin");
  await page.getByRole("button", { name: "Esci", exact: true }).click();
  await expect(page.getByLabel("Passcode")).toBeVisible();
  await page.goto("/spell/palla-di-fuoco");
  await page.waitForTimeout(500);
  await expect(edit(page)).toHaveCount(0);
  await page.goto("/equipaggiamento/armi");
  await page.waitForTimeout(500);
  await expect(page.getByRole("link", { name: /^Modifica / })).toHaveCount(0);
});
