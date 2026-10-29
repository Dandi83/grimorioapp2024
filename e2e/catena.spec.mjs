import { test, expect } from "@playwright/test";

// Cards written in the reserved area are shown like the SRD cards (lib/card-display.ts): condition and spell
// links, damage icons, highlighted block, labels, search and filters; the editor preview is the public card;
// a spell hidden with the eye is plain text. Local test database only: everything made here is deleted.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5));
      if (!window.localStorage.getItem("grimorio.edizione")) window.localStorage.setItem("grimorio.edizione", "2024");
    } catch { /* no storage */ }
  });
});

const SHOTS = process.env.CATENA_SHOTS;

async function login(page) {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
}

/**
 * An admin page right after a switch that refreshes every page: the local test database (PGlite behind one
 * socket) can mix up the queries of the pages rebuilt in the background with this one and answer 500 once
 * («unnamed prepared statement does not exist»); a second load is served normally. Real Postgres has no such limit.
 * The same mix-up in the session check shows the passcode form (lib/admin-auth.ts: a failed query is no session).
 */
async function openAdmin(page, path) {
  const response = await page.goto(path);
  if ((response && response.status() >= 500) || await page.getByLabel("Passcode").isVisible()) await page.goto(path);
}

/** The public card as a visitor sees it (a separate context, no admin session). */
async function publicPage(browser, path) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => { try { window.localStorage.setItem("grimorio.edizione", "2024"); window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
  const page = await context.newPage();
  await page.goto(path);
  return page;
}
/** The markup of a section: tags, attributes in a fixed order (the browser and the server order them differently) and text. */
const markup = locator => locator.evaluate(root => {
  const write = node => node.nodeType === Node.TEXT_NODE ? node.textContent
    : node.nodeType !== Node.ELEMENT_NODE ? ""
    : `<${node.localName}${[...node.attributes].filter(attribute => !["id", "aria-labelledby"].includes(attribute.name)).map(attribute => ` ${attribute.name}="${attribute.value}"`).sort().join("")}>${[...node.childNodes].map(write).join("")}</${node.localName}>`;
  return [...root.childNodes].map(write).join("");
});

test("cards written in the reserved area: links, icons, labels, search, filters and preview like the SRD cards", async ({ page, browser, request }) => {
  test.setTimeout(300_000);
  await login(page);

  // A new spell, plain text typed in the editor, with concentration and ritual.
  await page.goto("/admin/edizione?valore=2024&poi=%2Fadmin%2Fincantesimi");
  await page.getByRole("button", { name: "Nuovo", exact: true }).click();
  let editor = page.getByRole("dialog");
  await editor.getByLabel("Nome *").fill("Fiamma del Grimorio");
  await editor.locator("#spell-level").selectOption("2");
  await editor.locator("#spell-school").selectOption({ label: "Invocazione" });
  await editor.locator("#tempo_di_lancio").selectOption("azione o rituale");
  await editor.locator("#gittata").selectOption("18 metri");
  await editor.locator("#durata").selectOption("concentrazione, fino a 1 minuto");
  await editor.locator("#spell-description").click();
  await page.keyboard.type("Il bersaglio subisce 2d6 danni da fuoco e resta accecato fino alla fine del turno. Funziona come palla di fuoco, ma su un solo bersaglio.");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Utilizzo di uno slot incantesimo di livello superiore. I danni aumentano di 1d6 per ogni slot di livello superiore al 2°.");
  await editor.getByRole("button", { name: "Anteprima" }).click();
  const preview = editor.locator("[data-card-description]");
  await expect(preview.getByRole("link", { name: "accecato" })).toHaveAttribute("href", "/manuale/condizioni-accecato");
  const previewSpell = await markup(preview);
  const previewLabels = await editor.locator("[data-card-labels] > span").allInnerTexts();
  await editor.getByRole("button", { name: "Crea nel catalogo" }).click();
  await expect(editor).toHaveCount(0);
  await page.getByPlaceholder("Cerca per nome o scuola…").fill("fiamma del grimorio");
  const spellPath = await page.locator("main ul li[data-card-row]").filter({ hasText: "Fiamma del grimorio" }).first().getAttribute("data-public-href");

  // The public card: condition link, fire icon, link to the other spell, highlighted block, labels.
  let visitor = await publicPage(browser, spellPath);
  const description = visitor.locator("[data-card-description]");
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText("Fiamma del grimorio");
  await expect(description.getByRole("link", { name: "accecato" })).toHaveAttribute("href", "/manuale/condizioni-accecato");
  await expect(description.locator('[data-damage-type="fire"]')).toHaveCount(1);
  await expect(description.getByRole("link", { name: "palla di fuoco" })).toHaveAttribute("href", "/spell/palla-di-fuoco");
  await expect(description.getByRole("heading", { level: 3, name: "Utilizzo di uno slot incantesimo di livello superiore." })).toBeVisible();
  const labels = visitor.locator("[data-card-labels]");
  await expect(labels).not.toContainText("Concentrazione");
  await expect(visitor.getByRole("link", { name: /^concentrazione$/i })).toHaveAttribute("href", "/regole/concentrazione");
  await expect(labels).toContainText("Rituale");
  // «Aggiunta da te» is for the administrator only (e2e/etichette-admin.spec.mjs): in the preview, not for the visitor.
  await expect(labels).not.toContainText("Aggiunta da te");
  await expect(visitor.getByText("Azione o rituale", { exact: true })).toBeVisible();
  // The editor preview is the public card.
  expect(await markup(description)).toBe(previewSpell);
  expect(await labels.locator("> span").allInnerTexts()).toEqual(previewLabels.filter(label => label !== "Aggiunta da te"));
  expect(previewLabels).toContain("Aggiunta da te");
  if (SHOTS) await visitor.screenshot({ path: `${SHOTS}/incantesimo-aggiunto-390.png`, fullPage: true });
  await visitor.context().close();
  // Search and filters: the index of the Home and the list data of the filters.
  const index = await (await request.get("/ricerca-indice.json")).json();
  expect(index.rows.some(row => row[1] === "Fiamma del grimorio" && row[3] === spellPath)).toBe(true);
  const listed = (await (await request.get("/api/catalogo/incantesimi")).json()).spells.find(spell => `/spell/${spell.id}` === spellPath);
  expect(listed).toMatchObject({ livello_num: 2, scuola: "Invocazione", concentrazione: true, rituale: true });
  visitor = await publicPage(browser, "/?cerca=fiamma%20del%20grimorio");
  await expect(visitor.getByRole("link", { name: /Fiamma del grimorio/ }).first()).toBeVisible();
  await visitor.context().close();

  // A new creature: the new spell named in its text, a condition, damage, GS, PE, type, habitat.
  await page.goto("/admin/mostri");
  await page.getByRole("button", { name: "Nuovo", exact: true }).click();
  await page.getByRole("dialog", { name: "Nuova creatura" }).getByRole("button", { name: "Scheda", exact: true }).click();
  editor = page.getByRole("dialog");
  await editor.locator("#nome").fill("Guardiano di cenere");
  await editor.locator("#tipo").selectOption({ label: "Costrutto" });
  await editor.locator("#taglia").selectOption({ label: "Media" });
  await editor.locator("#grado_sfida").selectOption("3");
  await editor.locator("#px").fill("700");
  await editor.getByLabel("Sottosuolo").check();
  await editor.locator("summary").filter({ hasText: /^Azioni/ }).first().click();
  await editor.getByRole("button", { name: "Aggiungi azione", exact: true }).click();
  await editor.locator('[id^="azioni-"][id$="-title"]').first().fill("Raggio di cenere");
  await editor.locator('[id^="azioni-"][id$="-body"]').first().click();
  await page.keyboard.type("Il guardiano lancia Fiamma del Grimorio: il bersaglio subisce 7 (2d6) danni da fuoco ed è prono.");
  await editor.getByRole("button", { name: "Anteprima" }).click();
  const actionsPreview = editor.locator("section[data-monster-section]").filter({ has: page.getByRole("heading", { name: "Azioni", exact: true }) });
  await expect(actionsPreview.getByRole("link", { name: "Fiamma del Grimorio" })).toHaveAttribute("href", spellPath);
  const previewMonster = await markup(actionsPreview);
  await editor.getByRole("button", { name: "Crea nel catalogo" }).click();
  await expect(editor).toHaveCount(0);
  await page.getByPlaceholder("Cerca per nome o tipo…").fill("guardiano di cenere");
  const monsterPath = await page.locator("main ul li[data-card-row]").filter({ hasText: "Guardiano di cenere" }).first().getAttribute("data-public-href");
  visitor = await publicPage(browser, monsterPath);
  const actions = visitor.locator("section[data-monster-section]").filter({ has: visitor.getByRole("heading", { name: "Azioni", exact: true }) });
  await expect(actions.getByRole("link", { name: "Fiamma del Grimorio" })).toHaveAttribute("href", spellPath);
  await expect(actions.getByRole("link", { name: "prono" })).toHaveAttribute("href", "/manuale/condizioni-prono");
  await expect(actions.locator('[data-damage-type="fire"]')).toHaveCount(1);
  await expect(visitor.getByText("Grado sfida")).toBeVisible();
  await expect(visitor.locator("main")).toContainText("700 PE");
  await expect(visitor.locator("main")).toContainText("Costrutto");
  await expect(visitor.locator("main")).toContainText("Habitat Sottosuolo");
  await expect(visitor.locator("[data-card-source]")).toHaveCount(0);
  expect(await markup(actions)).toBe(previewMonster);
  await visitor.context().close();
  const creature = (await (await request.get("/api/catalogo/bestiario")).json()).monsters.find(row => `/mostro/${row.id}` === monsterPath);
  expect(creature).toMatchObject({ tipo: "Costrutto", grado_sfida: "3", habitat: ["Sottosuolo"] });

  // The spell hidden with the eye: plain text on the creature for the public; shown again, a link again.
  await page.goto("/admin/incantesimi");
  await page.getByPlaceholder("Cerca per nome o scuola…").fill("fiamma del grimorio");
  await page.getByRole("switch", { name: "Visibile sul sito: Fiamma del grimorio" }).click();
  await expect(page.getByRole("switch", { name: "Visibile sul sito: Fiamma del grimorio" })).toHaveAttribute("aria-checked", "false");
  visitor = await publicPage(browser, monsterPath);
  await expect(visitor.locator("main")).toContainText("Fiamma del Grimorio");
  await expect(visitor.locator(`a[href="${spellPath}"]`)).toHaveCount(0);
  await visitor.context().close();
  await page.getByRole("switch", { name: "Visibile sul sito: Fiamma del grimorio" }).click();
  await expect(page.getByRole("switch", { name: "Visibile sul sito: Fiamma del grimorio" })).toHaveAttribute("aria-checked", "true");

  // A homebrew of the Grimorio (published as an approved proposal): the same chain.
  await openAdmin(page, "/admin/mostri");
  await page.getByRole("button", { name: "Nuovo", exact: true }).click();
  await page.getByRole("dialog", { name: "Nuova creatura" }).getByRole("button", { name: "Creati da voi", exact: true }).click();
  editor = page.getByRole("dialog");
  await editor.locator("#admin-hb-nome").fill("Spirito di cenere");
  await editor.locator("#admin-hb-azioni-0-nome").fill("Vampa");
  await editor.locator("#admin-hb-azioni-0-testo").fill("Lo spirito lancia Fiamma del Grimorio: il bersaglio subisce 4 (1d8) danni da fuoco ed è accecato.");
  await editor.getByRole("button", { name: "Salva" }).click();
  await expect(editor).toHaveCount(0);
  const brewPath = "/mostro/homebrew-spirito-di-cenere";
  // «I mostri creati da voi» is switched off (lib/community.ts): the sheet is seen by the administrator, «Nascosta».
  await expect.poll(async () => (await page.request.get(brewPath)).status()).toBe(200);
  await page.goto(brewPath);
  await expect(page.locator("main").getByRole("link", { name: "Fiamma del Grimorio" })).toHaveAttribute("href", spellPath);
  await expect(page.locator("main").getByRole("link", { name: "accecato" })).toHaveAttribute("href", "/manuale/condizioni-accecato");
  await expect(page.locator('main [data-damage-type="fire"]')).toHaveCount(1);

  // Clean up: the homebrew, the creature and the spell.
  await page.goto("/admin/mostri");
  for (const name of ["Spirito di cenere", "Guardiano di cenere"]) {
    await page.getByPlaceholder("Cerca per nome o tipo…").fill(name.toLowerCase());
    page.once("dialog", dialog => dialog.accept());
    await page.locator("main ul li[data-card-row]").filter({ hasText: name }).dispatchEvent("contextmenu");
    await page.locator("[data-row-menu]").getByRole("button", { name: "Elimina" }).click();
    await expect(page.locator("main ul li[data-card-row]").filter({ hasText: name })).toHaveCount(0);
  }
  await page.goto("/admin/incantesimi");
  await page.getByPlaceholder("Cerca per nome o scuola…").fill("fiamma del grimorio");
  page.once("dialog", dialog => dialog.accept());
  await page.locator("main ul li[data-card-row]").filter({ hasText: "Fiamma del grimorio" }).dispatchEvent("contextmenu");
  await page.locator("[data-row-menu]").getByRole("button", { name: "Elimina" }).click();
  await expect(page.locator("main ul li[data-card-row]").filter({ hasText: "Fiamma del grimorio" })).toHaveCount(0);
});

test("SRD cards: Marchio del cacciatore without the page break, the dragon title whole", async ({ page }) => {
  await page.goto("/spell/marchio-del-cacciatore");
  const text = page.locator("[data-card-description]");
  await expect(text).toContainText("utilizzando uno slot incantesimo di 3º o 4º livello (fino a 8 ore)");
  expect(await text.evaluate(node => /incantesimo di\s*<br/.test(node.innerHTML))).toBe(false);
  await expect(page.locator("[data-card-source]")).toHaveText("SRD 5.2.1");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/marchio-del-cacciatore-390.png`, fullPage: true });
  await page.goto("/mostro/drago-rosso-adulto");
  await expect(page.getByText("Resistenza leggendaria (3/giorno o 4/giorno nella tana).", { exact: true })).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/drago-rosso-adulto-390.png`, fullPage: true });
});
