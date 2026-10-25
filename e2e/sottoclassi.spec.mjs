import { test, expect } from "@playwright/test";

// Subclasses added by the administrator: «+ Nuova sottoclasse» in the admin page of a class, features at the SRD
// levels with name and text empty, born hidden with «NO SRD», shown with the eye, in the selector of the class
// after the SRD one with the same card, links of the display chain, «Modifica», bin and Registro.
// Local test database only: the subclass made here is deleted at the end.
const SHOTS = process.env.SOTTOCLASSI_SHOTS;
const NAME = "Guerriero di prova";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5));
      window.localStorage.setItem("grimorio.edizione", "2024");
    } catch { /* no storage */ }
  });
});

async function login(page) {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByRole("link", { name: "Sezioni dell’app" })).toBeVisible();
}

async function visitor(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => { try { localStorage.setItem("grimorio.edizione", "2024"); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
  return context.newPage();
}

const subclassTab = page => page.locator('[data-edition="2024"], body').first().getByRole("tab", { name: /^Sottoclasse/ }).filter({ visible: true }).first();

test("added subclass: empty features at the SRD levels, hidden with NO SRD, shown in the selector like the Campione", async ({ page, browser, request }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  // 2014 too: the levels of that edition (Mago 2014: 2, 6, 10, 14); nothing saved.
  await page.goto("/admin/contenuti/classi/mago/sottoclassi/nuova?edizione=2014");
  await expect(page.locator('select[aria-label^="Livello del privilegio"]')).toHaveCount(4);
  expect(await page.locator('select[aria-label^="Livello del privilegio"]').evaluateAll(list => list.map(select => select.value))).toEqual(["2", "6", "10", "14"]);

  await page.goto("/admin/edizione?valore=2024&poi=%2Fadmin%2Fcontenuti%2Fclassi%2Fguerriero");
  await page.getByRole("link", { name: "+ Nuova sottoclasse" }).click();
  await expect(page).toHaveURL(/\/admin\/contenuti\/classi\/guerriero\/sottoclassi\/nuova\?edizione=2024$/);
  const levels = page.locator('select[aria-label^="Livello del privilegio"]');
  expect(await levels.evaluateAll(list => list.map(select => select.value))).toEqual(["3", "7", "10", "15", "18"]);
  for (let n = 1; n <= 5; n++) {
    await expect(page.getByLabel(`Nome del privilegio ${n}`)).toHaveValue("");
    await expect(page.getByLabel(`Testo del privilegio ${n}`)).toHaveValue("");
  }
  await expect(page.locator("#subclass-nome")).toHaveValue("");

  // Name, introduction, two features; entries added, reordered and removed; a feature moved and one removed.
  await page.locator("#subclass-nome").fill(NAME);
  await page.locator("#subclass-descrizione").fill("Un guerriero che affina la mente in battaglia.");
  await page.getByLabel("Nome del privilegio 1").fill("Lama della mente");
  await page.getByLabel("Testo del privilegio 1").fill("Quando colpisce, il bersaglio subisce 1d6 danni psichici e cade prono.");
  await page.getByRole("button", { name: "Aggiungi voce al privilegio 1" }).click();
  await page.getByRole("button", { name: "Aggiungi voce al privilegio 1" }).click();
  await page.getByLabel("Nome della voce 1 del privilegio 1").fill("Seconda");
  await page.getByLabel("Testo della voce 1 del privilegio 1").fill("Testo della seconda voce.");
  await page.getByLabel("Nome della voce 2 del privilegio 1").fill("Prima");
  await page.getByLabel("Testo della voce 2 del privilegio 1").fill("Testo della prima voce.");
  await page.getByRole("button", { name: "Sposta su la voce 2 del privilegio 1" }).click();
  await expect(page.getByLabel("Nome della voce 1 del privilegio 1")).toHaveValue("Prima");
  await page.getByRole("button", { name: "Aggiungi voce al privilegio 1" }).click();
  await page.getByRole("button", { name: "Togli la voce 3 del privilegio 1" }).click();
  await expect(page.getByLabel("Nome della voce 3 del privilegio 1")).toHaveCount(0);
  await page.getByLabel("Nome del privilegio 2").fill("Mente salda");
  await page.getByLabel("Testo del privilegio 2").fill("Il guerriero non può essere spaventato.");
  await page.getByRole("button", { name: "Aggiungi privilegio" }).click();
  await expect(levels).toHaveCount(6);
  await page.getByRole("button", { name: "Togli il privilegio 6" }).click();
  await expect(levels).toHaveCount(5);
  // The preview is the public card.
  const preview = page.locator("[data-subclass-card]");
  await expect(preview.getByRole("heading", { level: 2 })).toHaveText(NAME);
  await expect(preview.locator("[data-no-srd]")).toHaveText("NO SRD");
  await expect(preview.getByRole("link", { name: "prono" })).toHaveAttribute("href", "/manuale/condizioni-prono");
  await expect(preview.locator("section")).toHaveCount(2);
  await page.getByRole("button", { name: "Crea sottoclasse (nascosta)" }).click();

  // Back in the admin page of the class: hidden, NO SRD.
  await expect(page).toHaveURL(/\/admin\/contenuti\/classi\/guerriero\?edizione=2024$/);
  const row = page.locator("[data-subclass-row]").filter({ hasText: NAME });
  await expect(row.locator("[data-no-srd]")).toBeVisible();
  await expect(row.getByText("Nascosta", { exact: true })).toBeVisible();
  await expect(row.getByRole("button", { name: `Mostra sul sito: ${NAME}` })).toBeVisible();

  // The administrator sees it in the selector, labelled; the public does not, not even in the page sent.
  await page.goto("/classi/guerriero");
  await subclassTab(page).click();
  const picker = page.getByRole("group", { name: /^Sottoclassi del guerriero/i }).filter({ visible: true });
  await expect(picker.getByRole("button")).toHaveText(["Campione", `${NAME}Nascosta`]);
  let guest = await visitor(browser);
  await guest.goto("/classi/guerriero");
  await subclassTab(guest).click();
  await expect(guest.getByRole("group", { name: /^Sottoclassi del guerriero/i })).toHaveCount(0);
  expect(await guest.content()).not.toContain(NAME);
  expect(await (await request.get("/classi/guerriero")).text()).not.toContain(NAME);
  await guest.context().close();

  // Shown with the eye: in the selector after the Campione, same card; the condition is a link.
  await page.goto("/admin/contenuti/classi/guerriero?edizione=2024");
  await row.getByRole("button", { name: `Mostra sul sito: ${NAME}` }).click();
  await expect(row.getByRole("button", { name: `Nascondi dal sito: ${NAME}` })).toBeVisible();
  await expect.poll(async () => (await request.get("/classi/guerriero")).text(), { timeout: 30_000 }).toContain(NAME);
  guest = await visitor(browser);
  await guest.goto("/classi/guerriero");
  await subclassTab(guest).click();
  const choose = guest.getByRole("group", { name: /^Sottoclassi del guerriero/i }).filter({ visible: true });
  await expect(choose.getByRole("button")).toHaveText(["Campione", NAME]);
  const card = guest.locator("[data-subclass-card]").filter({ visible: true });
  // Screenshots of the cards alone: the fixed navigation bar would cover them.
  if (SHOTS) await guest.addStyleTag({ content: 'nav[aria-label="Navigazione principale"]{display:none!important}' });
  await expect(card.getByRole("heading", { level: 2 })).toHaveText("Campione");
  if (SHOTS) await card.screenshot({ path: `${SHOTS}/campione-390.png` });
  await choose.getByRole("button", { name: NAME }).click();
  await expect(card.getByRole("heading", { level: 2 })).toHaveText(NAME);
  await expect(card.locator("[data-no-srd]")).toHaveText("NO SRD");
  await expect(card.getByRole("link", { name: "prono" })).toHaveAttribute("href", "/manuale/condizioni-prono");
  await expect(card.locator("strong").first()).toHaveText("Prima. ");
  await expect(card.getByRole("heading", { level: 3 })).toHaveText(["Lama della mente", "Mente salda"]);
  if (SHOTS) await card.screenshot({ path: `${SHOTS}/sottoclasse-aggiunta-390.png` });
  await guest.context().close();

  // «Modifica» from the public page opens its editor.
  await page.goto("/classi/guerriero");
  await subclassTab(page).click();
  await page.getByRole("group", { name: /^Sottoclassi del guerriero/i }).filter({ visible: true }).getByRole("button", { name: NAME }).click();
  await page.getByRole("link", { name: `Modifica ${NAME}`, exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/admin\/contenuti\/classi\/guerriero\/sottoclassi\/guerriero--guerriero-di-prova\?ritorno=/);
  await expect(page.locator("#subclass-nome")).toHaveValue(NAME);
  await page.getByLabel("Nome del privilegio 2").fill("Mente salda e lucida");
  await page.getByRole("button", { name: "Salva modifiche" }).click();
  await expect(page).toHaveURL(/\/classi\/guerriero$/);

  // Registro: created (hidden), shown, corrected.
  await page.goto("/admin/registro?sezione=classi");
  const log = page.getByRole("list", { name: "Modifiche" });
  await expect(log.getByText("Creata (nascosta)")).toBeVisible();
  await expect(log.getByText("Corretta")).toBeVisible();
  await expect(log.locator("li").filter({ hasText: NAME }).filter({ hasText: "visibilità" }).first()).toBeVisible();

  // Bin: gone from the site; the log says so.
  await page.goto("/admin/contenuti/classi/guerriero?edizione=2024");
  page.once("dialog", dialog => dialog.accept());
  await row.getByRole("button", { name: "Elimina" }).click();
  await expect(page.locator("[data-subclass-row]").filter({ hasText: NAME })).toHaveCount(0);
  await expect.poll(async () => (await request.get("/classi/guerriero")).text(), { timeout: 30_000 }).not.toContain(NAME);
  await page.goto("/admin/registro?sezione=classi");
  await expect(page.getByRole("list", { name: "Modifiche" }).getByText("Eliminata")).toBeVisible();
});
