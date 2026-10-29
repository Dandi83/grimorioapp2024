import { test, expect } from "@playwright/test";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";

// «I mostri creati da voi» with the switch on: on in the code since PROMPT 15 («Beta»); before, e2e/run.mjs built it
// with GRIMORIO_COMMUNITY_TEST_PUBLIC=on for the tests only. What the visitors see. Local test database only.
const COMMUNITY_ID = "homebrew-prova-pubblica-viverna";
// Ours is made from the reserved area: its save refreshes the cached lists of the site (a row written only in the
// database would not reach them before the hour of lib/monster-index.ts).
const OURS_ID = "homebrew-custode-pubblico";
const draft = (nome, gs) => ({
  edizione: "2024", nome, taglia: "Grande", tipo: "Drago", allineamento: "caotico neutrale", ca: 15, ca_nota: "", pf: 90, dadi_vita: "12d10 + 24",
  velocita: "9 m", forza: 18, destrezza: 12, costituzione: 15, intelligenza: 8, saggezza: 12, carisma: 10, ts_competenti: [],
  abilita: "", vulnerabilita: "", resistenze: "", immunita_danni: "", immunita_condizioni: "", sensi: "", linguaggi: "", habitat: [], grado_sfida: gs,
  tratti: [], azioni: [{ nome: "Morso", testo: "Tiro per colpire in mischia: +6, portata 3 m. Colpito: 13 (2d8 + 4) danni perforanti." }],
  azioni_bonus: [], reazioni: [], azioni_leggendarie: [],
});
async function database(run) {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try { return await run(client); } finally { await client.end(); }
}

test.beforeAll(async () => {
  await database(async client => {
    await client.query(`CREATE TABLE IF NOT EXISTS grimorio_homebrew (id text PRIMARY KEY, scheda jsonb NOT NULL,
      edizione text NOT NULL CHECK (edizione IN ('2014', '2024', 'entrambe')), autore text, proposta_id uuid,
      pubblicata_il timestamptz NOT NULL DEFAULT now(), aggiornata_il timestamptz NOT NULL DEFAULT now(), licenza text)`);
    await client.query("INSERT INTO grimorio_homebrew (id, scheda, edizione, autore, licenza) VALUES ($1, $2, 'entrambe', 'Lia', 'CC BY-NC-SA 4.0') ON CONFLICT (id) DO NOTHING",
      [COMMUNITY_ID, JSON.stringify(draft("Viverna pubblica", "5"))]);
  });
});
// Clean up after the last test: the community row from the database, ours with the bin of the reserved area (the
// cached lists of the site refreshed again: e2e/homebrew.spec.mjs starts with no creature of «Creati da voi»).
test.afterAll(async ({ browser }) => {
  await database(client => client.query("DELETE FROM grimorio_homebrew WHERE id = $1", [COMMUNITY_ID]));
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const admin = await context.newPage();
  await login(admin);
  await admin.goto("/admin/mostri");
  await admin.getByRole("group", { name: "Edizione dell’area riservata" }).getByRole("button", { name: "2024" }).click();
  await admin.getByPlaceholder("Cerca per nome o tipo…").fill("custode pubblico");
  admin.once("dialog", dialog => dialog.accept());
  await admin.locator("main ul li[data-card-row]").filter({ hasText: "Custode pubblico" }).dispatchEvent("contextmenu");
  await admin.locator("[data-row-menu]").getByRole("button", { name: "Elimina" }).click();
  await expect.poll(async () => (await (await context.request.get("/api/catalogo/bestiario")).json()).monsters.some(monster => monster.homebrew)).toBe(false);
  await context.close();
});

async function login(page) {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
}

test("switch on: a visitor sees the card, the category, the section, the form and the sheets, without «Nascosta»", async ({ page, request, browser }) => {
  test.setTimeout(180_000);
  // The administrator publishes «Custode pubblico» (2024, ours): the lists of the site are refreshed.
  const adminContext = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const admin = await adminContext.newPage();
  await login(admin);
  await admin.goto("/admin/mostri");
  await admin.getByRole("group", { name: "Edizione dell’area riservata" }).getByRole("button", { name: "2024" }).click();
  await expect(admin.getByTestId("admin-edition-band")).toHaveText("2024");
  await admin.getByRole("button", { name: "Nuovo", exact: true }).click();
  await admin.getByRole("dialog", { name: "Nuova creatura" }).getByRole("button", { name: "Creati da voi", exact: true }).click();
  const editor = admin.getByRole("dialog");
  await editor.locator("#admin-hb-nome").fill("Custode pubblico");
  await editor.locator("#admin-hb-gs").selectOption("3");
  await editor.locator("#admin-hb-azioni-0-nome").fill("Pugno");
  await editor.locator("#admin-hb-azioni-0-testo").fill("Tiro per colpire in mischia: +5, portata 1,5 m. Colpito: 10 (2d6 + 3) danni contundenti.");
  await editor.getByRole("button", { name: "Salva" }).click();
  await expect(editor).toHaveCount(0);

  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5));
      if (!window.localStorage.getItem("grimorio.edizione")) window.localStorage.setItem("grimorio.edizione", "2024");
    } catch { /* no storage */ }
  });
  for (const path of ["/bestiario/creati-da-voi", "/bestiario/proponi", `/mostro/${COMMUNITY_ID}`, `/mostro/${OURS_ID}`]) {
    await expect.poll(async () => (await request.get(path)).status(), { message: path }).toBe(200);
  }
  expect((await request.get("/api/proposte")).status()).toBe(200);
  await expect.poll(async () => (await (await request.get("/api/catalogo/bestiario")).json()).monsters.filter(monster => monster.homebrew).length).toBe(2);

  await page.goto("/bestiario");
  const card = page.locator("[data-community-invite]");
  await expect(card).toHaveAttribute("data-community-invite", "2");
  await expect(card).not.toContainText("Nascosta");
  await expect(card.getByRole("link", { name: "Sfoglia · 2" })).toBeVisible();
  await page.getByRole("button", { name: /^Filtri/ }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Creati da voi", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");

  await card.getByRole("link", { name: "Sfoglia · 2" }).click();
  await expect(page).toHaveURL(/\/bestiario\/creati-da-voi$/);
  await expect(page.locator("[data-community-switch]")).toHaveCount(0);
  await expect(page.locator("[data-community-chip]")).toHaveText(["Tutti · 2", "Dalla community · 1", "Dal Grimorio · 1"]);
  const row = id => page.locator("li.catalog-row").filter({ has: page.locator(`a[href="/mostro/${id}"]`) });
  await expect(row(COMMUNITY_ID).locator("[data-homebrew-pill=community]")).toHaveText("Creato da voi");
  await expect(row(COMMUNITY_ID)).toContainText("2014 e 2024");
  await expect(row(COMMUNITY_ID)).toContainText("di Lia");
  await expect(row(OURS_ID).locator("[data-homebrew-pill=grimorio]")).toHaveText("Creato dal Grimorio");

  // «2014 e 2024»: in the 2014 Bestiario too, alone.
  await page.goto(`/mostro/${COMMUNITY_ID}`);
  await expect(page.locator("[data-homebrew-byline=community]")).toHaveText("Proposta da Lia");
  await expect(page.getByText("Nascosta")).toHaveCount(0);
  await page.goto("/bestiario/proponi");
  await expect(page.locator("[data-progress] li")).toHaveCount(4);
  await expect(page.locator("[data-community-switch]")).toHaveCount(0);

  // Search and Preferiti: the rows with their pill.
  await expect.poll(async () => (await request.get("/ricerca-indice.json")).text()).toContain(`/mostro/${COMMUNITY_ID}`);
  const index = await (await request.get("/ricerca-indice.json")).text();
  expect(index).toContain("Creato da voi · ");
  expect(index).toContain("Creato dal Grimorio · ");

  // The two creatures stay for the next tests of this file; the clean up is after the last one (test.afterAll).
  await adminContext.close();
});

test("switch on: in /admin/sezioni «I mostri creati da voi» has its usual state and working buttons", async ({ page }) => {
  await login(page);
  await page.goto("/admin/sezioni");
  const bestiario = page.locator('[data-section-row="bestiario"]');
  await bestiario.locator("[data-parts-summary]").click();
  const row = page.locator('[data-part-row="bestiario:homebrew"]');
  await expect(row).toContainText("Visibile");
  await expect(row.locator("[data-switch-off]")).toHaveCount(0);
  const group = row.getByRole("radiogroup", { name: "Stato di I mostri creati da voi" });
  await expect(group).not.toHaveAttribute("aria-disabled", "true");
  for (const label of ["Visibile", "In arrivo", "Nascosta"]) await expect(group.getByRole("radio", { name: label })).toBeEnabled();
  // A real change: «Nascosta» takes it away from the visitors, «Visibile» gives it back.
  const visitor = await page.context().browser().newContext({ baseURL: test.info().project.use.baseURL });
  const guest = path => visitor.request.get(path).then(response => response.status());
  expect(await guest("/bestiario/creati-da-voi")).toBe(200);
  await group.getByRole("radio", { name: "Nascosta" }).click();
  await expect(page.getByRole("status").filter({ hasText: "I mostri creati da voi ora è nascosta" })).toBeVisible();
  await expect(row.locator("[data-switch-off]")).toHaveCount(0);
  for (const path of ["/bestiario/creati-da-voi", "/bestiario/proponi"]) await expect.poll(() => guest(path), { message: path }).toBe(404);
  expect(await guest("/api/proposte")).toBe(404);
  await group.getByRole("radio", { name: "Visibile" }).click();
  await expect(page.getByRole("status").filter({ hasText: "I mostri creati da voi ora è visibile" })).toBeVisible();
  for (const path of ["/bestiario/creati-da-voi", "/bestiario/proponi"]) await expect.poll(() => guest(path), { message: path }).toBe(200);
  expect(await guest("/api/proposte")).toBe(200);
  await visitor.close();
});

test("«Beta»: on the card, the section and the form, with its note on a tap; never on the sheets or the lists", async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => { try { window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/bestiario");
  const card = page.locator("[data-community-invite]");
  const beta = card.locator("[data-beta-pill]");
  await expect(beta).toHaveText("Beta");
  await expect(beta).toHaveCSS("font-size", "11px");
  await expect(beta).toHaveCSS("font-weight", "700");
  await expect(beta).toHaveCSS("color", "rgb(224, 162, 26)");
  await expect(beta).toHaveCSS("border-top-color", "rgb(224, 162, 26)");
  await expect(beta).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  // A tap: the note, described by the pill; a tap outside closes it.
  const note = card.locator("[data-beta-note]");
  await expect(note).toBeHidden();
  await beta.click();
  await expect(note).toBeVisible();
  await expect(note).toHaveText("Sezione nuova: può cambiare. Se qualcosa non va, scrivici da Info → Segnala un problema.");
  expect(await beta.getAttribute("aria-describedby")).toBe(await note.getAttribute("id"));
  await page.locator("main").getByRole("searchbox").first().click();
  await expect(note).toBeHidden();
  for (const path of ["/bestiario/creati-da-voi", "/bestiario/proponi"]) {
    await page.goto(path);
    const pill = page.getByRole("heading", { level: 1 }).locator("[data-beta-pill]");
    await expect(pill, path).toHaveText("Beta");
    await expect(pill).toHaveCSS("color", "rgb(122, 78, 0)");
    await expect(pill).toHaveCSS("background-color", "rgb(252, 239, 208)");
  }
  // Computer: the note on the mouse.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/bestiario/creati-da-voi");
  const header = page.locator("[data-community-header]").filter({ visible: true });
  await header.locator("[data-beta-pill]").hover();
  await expect(header.locator("[data-beta-note]")).toBeVisible();
  // Not on the sheets, nor in the rows of the lists.
  await page.goto(`/mostro/${COMMUNITY_ID}`);
  await expect(page.locator("main [data-beta-pill]")).toHaveCount(0);
  await page.goto("/bestiario/creati-da-voi");
  await expect(page.locator("li.catalog-row [data-beta-pill]")).toHaveCount(0);
});

for (const [width, edition] of [[390, "2024"], [1280, "2014"]]) {
  test(`a visitor (${width}, ${edition}): card, category, section, the form in four steps up to the sending; nothing of it in the public pages`, async ({ page, request }) => {
    test.setTimeout(150_000);
    await database(client => client.query("DELETE FROM grimorio_homebrew_limits").catch(() => {}));
    await page.addInitScript(value => {
      try { window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); window.localStorage.setItem("grimorio.edizione", value); } catch { /* no storage */ }
    }, edition);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/bestiario");
    if (width < 1024) {
      await expect(page.locator("[data-community-invite] [data-beta-pill]")).toBeVisible();
      await page.getByRole("button", { name: /^Filtri/ }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Creati da voi", exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: /^Mostra \d+ risultat/ }).click();
      await expect(page).toHaveURL(/\/bestiario\/creati-da-voi$/);
    } else {
      await page.goto("/bestiario/creati-da-voi");
    }
    await expect(page.locator(`a[href="/mostro/${COMMUNITY_ID}"]`).filter({ visible: true }).first()).toBeVisible();
    await page.getByRole("link", { name: "Proponi un mostro" }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/bestiario\/proponi$/);
    const nome = `Mostro segreto ${width} ${edition}`, email = `autore-${width}-${edition}@esempio.it`;
    await page.getByRole("group", { name: "Edizione della scheda" }).getByRole("button", { name: edition, exact: true }).click();
    await page.locator("#hb-nome").fill(nome);
    await page.getByRole("button", { name: "Avanti: Difese e sensi" }).click();
    await page.locator('[data-chip-field="hb-resistenze"]').getByRole("button", { name: "fuoco" }).click();
    const languages = page.locator('[data-chip-field="hb-linguaggi"]');
    await languages.getByRole("button", { name: "Comune", exact: true }).click();
    await languages.getByRole("checkbox", { name: "Capisce ma non può parlare" }).check();
    await page.getByRole("button", { name: "Avanti: Azioni" }).click();
    await page.locator("#hb-azioni-0-nome").fill("Artiglio");
    await page.locator("#hb-azioni-0-testo").fill(edition === "2014"
      ? "Attacco con arma da mischia: +4 al tiro per colpire, portata 1,5 m, un bersaglio. Colpito: 7 (1d8 + 3) danni taglienti."
      : "Tiro per colpire in mischia: +4, portata 1,5 m. Colpito: 7 (1d8 + 3) danni taglienti.");
    await page.getByRole("button", { name: "Avanti: Invio" }).click();
    await page.getByLabel("Nickname *").fill(`Visitatore ${width}`);
    await page.getByLabel("Email (facoltativa)").fill(email);
    await page.getByLabel("È una mia creazione originale, non copiata da manuali o siti.").check();
    await page.getByLabel(/^Pubblico la creatura con licenza CC BY-NC-SA 4\.0/).check();
    await page.getByRole("button", { name: "Invia la proposta" }).click();
    await expect(page.getByText("Grazie! L’amministratore la guarderà presto.")).toBeVisible();
    const saved = await database(client => client.query("SELECT scheda FROM grimorio_homebrew_proposals WHERE scheda->>'nome' = $1", [nome]));
    expect(saved.rows[0].scheda).toMatchObject({ edizione: edition, resistenze: "fuoco", linguaggi: "capisce il Comune ma non lo parla" });
    // The proposal waits for the administrator: its name and the email never in the public pages or data.
    for (const path of ["/bestiario", "/bestiario/creati-da-voi", "/bestiario/proponi", "/api/catalogo/bestiario", "/api/catalogo/incantesimi", "/ricerca-indice.json", `/mostro/${COMMUNITY_ID}`]) {
      const body = await (await request.get(path)).text();
      expect(body, path).not.toContain(email);
      expect(body, path).not.toContain(nome);
      expect(body, path).not.toMatch(/[\w.+-]+@esempio\.it/);
    }
    // Our proposal and its count for the hourly limit go: the next files send their own.
    await database(client => client.query("DELETE FROM grimorio_homebrew_proposals WHERE scheda->>'nome' = $1", [nome]));
    await database(client => client.query("DELETE FROM grimorio_homebrew_limits"));
  });
}
