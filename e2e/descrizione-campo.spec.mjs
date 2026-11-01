import { test, expect } from "./fixtures.mjs";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";

// The field «Descrizione» (PROMPT 21): written in the form (step 1, with its counter), seen in the preview, sent with
// the proposal, kept by the approval and shown at the top of the published sheet (PROMPT 20); then changed by the
// administrator in the editor. Phone and computer. Local test database only.
const SHOTS = process.env.CAMPO_SHOTS;
const LICENSE_BOX = /^Pubblico la creatura con licenza CC BY-NC-SA 4\.0/;
const TEXT = "Un guardiano di muschio che dorme sotto le radici dei boschi antichi. Si sveglia solo quando qualcuno abbatte un albero.";
const CHANGED = "Corretto dall’amministratore: dorme sotto le radici e difende i boschi antichi.";
const NAMES = { 390: "Guardiano di muschio", 1280: "Guardiano di corteccia" };
const id = name => `homebrew-${name.toLowerCase().replace(/ /g, "-")}`;
let started;

async function database(run) {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try { return await run(client); } finally { await client.end(); }
}

async function login(page) {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
}

test.beforeAll(async () => {
  started = await database(async client => (await client.query("SELECT now() AS at")).rows[0].at);
});

// The cards published go with the bin of the reserved area (the cached lists of the site refreshed again: the other
// tests start with no creature of «Creati da voi»); the proposals and this file's send limits from the database.
test.afterAll(async ({ browser }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const admin = await context.newPage();
  await login(admin);
  await admin.goto("/admin/mostri");
  await admin.getByRole("group", { name: "Edizione dell’area riservata" }).getByRole("button", { name: "2024" }).click();
  for (const name of Object.values(NAMES)) {
    if (!(await database(async client => (await client.query("SELECT 1 FROM grimorio_homebrew WHERE id = $1", [id(name)]).catch(() => ({ rows: [] }))).rows.length))) continue;
    await admin.getByPlaceholder("Cerca per nome o tipo…").fill(name.toLowerCase());
    admin.once("dialog", dialog => dialog.accept());
    await admin.locator("main ul li[data-card-row]").filter({ hasText: name }).dispatchEvent("contextmenu");
    await admin.locator("[data-row-menu]").getByRole("button", { name: "Elimina" }).click();
    await expect(admin.locator("main ul li[data-card-row]").filter({ hasText: name })).toHaveCount(0);
  }
  await expect.poll(async () => (await (await context.request.get("/api/catalogo/bestiario")).json()).monsters.some(monster => monster.homebrew)).toBe(false);
  await context.close();
  await database(async client => {
    await client.query("DELETE FROM grimorio_homebrew_proposals WHERE scheda->>'nome' = ANY($1)", [Object.values(NAMES)]).catch(() => {});
    await client.query("DELETE FROM grimorio_homebrew_limits WHERE sent_at >= $1", [started]).catch(() => {});
    await client.query("DELETE FROM grimorio_homebrew_log WHERE homebrew_id = ANY($1)", [Object.values(NAMES).map(id)]).catch(() => {});
  });
});

for (const width of [390, 1280]) {
  test(`at ${width}: written in the form → preview → proposal → approval → at the top of the sheet → changed in the editor`, async ({ browser }) => {
    test.setTimeout(180_000);
    const name = NAMES[width];
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: 900 } });
    await context.addInitScript(() => { try { localStorage.setItem("grimorio.edizione", "2024"); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
    const page = await context.newPage();
    await page.goto("/bestiario/proponi");
    await expect(page.locator("[data-proposal-step]")).toHaveAttribute("data-proposal-step", "1");

    // Step 1, at the bottom of «Identità»: the field, its hint and its counter; at most 600 characters.
    const field = page.locator("#hb-descrizione");
    await expect(page.getByLabel("Descrizione", { exact: true })).toBeVisible();
    await expect(page.getByText("Com’è fatta, dove vive, come si comporta. Due o tre frasi bastano.")).toBeVisible();
    await expect(field).toHaveAttribute("maxlength", "600");
    await expect(page.locator("[data-description-count]")).toHaveText("0/600");
    await page.locator("#hb-nome").fill(name);
    await page.locator("#hb-ca").fill("15");
    await page.locator("#hb-pf").fill("60");
    await page.locator("#hb-dadi").fill("8d10 + 16");
    await page.locator("#hb-gs").selectOption("3");
    await field.fill(TEXT);
    await expect(page.locator("[data-description-count]")).toHaveText(`${TEXT.length}/600`);

    // The preview: the description at the top, as the sheet.
    await page.locator("[data-proposal-preview]").click();
    await expect(page.locator("[data-homebrew-preview] [data-monster-lead]")).toHaveText(TEXT);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/anteprima-${width}.png` });
    await page.locator("[data-proposal-preview]").click();

    await page.getByRole("button", { name: "Avanti: Difese e sensi" }).click();
    await page.getByRole("button", { name: "Avanti: Azioni" }).click();
    await page.locator("#hb-azioni-0-nome").fill("Radici");
    await page.locator("#hb-azioni-0-testo").fill("Tiro per colpire in mischia: +5, portata 3 m. Colpito: 12 (2d8 + 3) danni contundenti.");
    await page.getByRole("button", { name: "Avanti: Invio" }).click();
    await page.getByLabel("Nickname *").fill("Selva");
    await page.getByLabel("È una mia creazione originale, non copiata da manuali o siti.").check();
    await page.getByLabel(LICENSE_BOX).check();
    await page.getByRole("button", { name: "Invia la proposta" }).click();
    await expect(page.getByText(/Proposta inviata|Grazie/).first()).toBeVisible();
    // Saved with the proposal.
    expect(await database(async client => (await client.query("SELECT scheda->>'descrizione' AS d FROM grimorio_homebrew_proposals WHERE scheda->>'nome' = $1", [name])).rows[0]?.d)).toBe(TEXT);

    // The administrator approves: the card keeps it.
    const admin = await context.newPage();
    await login(admin);
    await admin.goto("/admin/proposte");
    const card = admin.locator("li[data-proposal]").filter({ has: admin.getByText(name, { exact: true }) });
    await card.getByRole("button", { name: "Approva" }).click();
    await expect(admin.getByRole("status").filter({ hasText: "Pubblicata" })).toBeVisible();
    expect(await database(async client => (await client.query("SELECT scheda->>'descrizione' AS d FROM grimorio_homebrew WHERE id = $1", [id(name)])).rows[0]?.d)).toBe(TEXT);

    // The published sheet: at the top, in italics, before the ink strip.
    await page.goto(`/mostro/${id(name)}`);
    await expect(page.locator("[data-monster-lead]")).toHaveText(TEXT);
    expect(await page.locator("article").first().evaluate(article => !!(article.querySelector("[data-monster-lead]").compareDocumentPosition(article.querySelector("[data-monster-strip]")) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    await expect(page.locator("[data-monster-section] > h2", { hasText: "Descrizione" })).toHaveCount(0);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/scheda-${width}.png` });

    // The editor of the reserved area: the same field, already filled in; the change reaches the sheet.
    await admin.goto(`/mostro/${id(name)}`);
    await admin.locator("[data-admin-edit]").filter({ visible: true }).first().click();
    const editor = admin.getByRole("dialog");
    await expect(editor.locator("#admin-hb-descrizione")).toHaveValue(TEXT);
    await editor.locator("#admin-hb-descrizione").fill(CHANGED);
    await expect(editor.locator("[data-description-count]")).toHaveText(`${CHANGED.length}/600`);
    await editor.getByRole("button", { name: "Salva" }).click();
    await expect(editor).toHaveCount(0);
    await expect.poll(async () => { await page.reload(); return page.locator("[data-monster-lead]").textContent(); }).toBe(CHANGED);
    await context.close();
  });
}
