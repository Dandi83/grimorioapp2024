import { test, expect } from "./fixtures.mjs";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";
import { chooseEdition, editionPill } from "./edition-pill.mjs";
import { readFileSync } from "node:fs";

// «I mostri creati da voi» (PROMPT 13) with the switch of lib/community.ts off, as in the site: the visitors see nothing
// of it (404, 403, no card, no category, no rows); the administrator sees everything, with «Nascosta», and can try the
// form in four steps. Two published creatures and the proposals are written only in the local test database.
const SHOTS = process.env.CREATI_SHOTS;
// Once Daniele turns the switch on, these checks of the closed section no longer apply (creati-da-voi-pubblico.spec.mjs does).
test.skip(!/COMMUNITY_PUBLIC = false;/.test(readFileSync("lib/community.ts", "utf8")), "«I mostri creati da voi» is switched on");
const COMMUNITY_ID = "homebrew-prova-viverna-di-cenere";
const OURS_ID = "homebrew-prova-custode-di-sale";
const draft = (nome, gs) => ({
  edizione: "2024", nome, taglia: "Grande", tipo: "Drago", allineamento: "caotico neutrale", ca: 15, ca_nota: "", pf: 90, dadi_vita: "12d10 + 24",
  velocita: "9 m, volo 18 m", forza: 18, destrezza: 12, costituzione: 15, intelligenza: 8, saggezza: 12, carisma: 10, ts_competenti: [],
  abilita: "", vulnerabilita: "", resistenze: "fuoco", immunita_danni: "", immunita_condizioni: "", sensi: "scurovisione 18 m", linguaggi: "Draconico", habitat: [], grado_sfida: gs,
  tratti: [], azioni: [{ nome: "Morso", testo: "Tiro per colpire in mischia: +6, portata 3 m. Colpito: 13 (2d8 + 4) danni perforanti." }],
  azioni_bonus: [], reazioni: [], azioni_leggendarie: [],
});

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
  await database(async client => {
    await client.query(`CREATE TABLE IF NOT EXISTS grimorio_homebrew (id text PRIMARY KEY, scheda jsonb NOT NULL,
      edizione text NOT NULL CHECK (edizione IN ('2014', '2024', 'entrambe')), autore text, proposta_id uuid,
      pubblicata_il timestamptz NOT NULL DEFAULT now(), aggiornata_il timestamptz NOT NULL DEFAULT now(), licenza text)`);
    await client.query("INSERT INTO grimorio_homebrew (id, scheda, edizione, autore, licenza) VALUES ($1, $2, '2024', 'Lia', 'CC BY-NC-SA 4.0') ON CONFLICT (id) DO NOTHING",
      [COMMUNITY_ID, JSON.stringify(draft("Viverna di cenere", "5"))]);
    await client.query("INSERT INTO grimorio_homebrew (id, scheda, edizione, autore, licenza) VALUES ($1, $2, '2024', NULL, 'CC BY-NC-SA 4.0') ON CONFLICT (id) DO NOTHING",
      [OURS_ID, JSON.stringify(draft("Custode di sale", "3"))]);
  });
});
test.afterAll(async () => {
  await database(async client => {
    await client.query("DELETE FROM grimorio_homebrew WHERE id = ANY($1)", [[COMMUNITY_ID, OURS_ID]]);
    await client.query("DELETE FROM grimorio_homebrew_proposals WHERE nickname LIKE 'Prova passi%'").catch(() => {});
    await client.query("DELETE FROM grimorio_homebrew_limits").catch(() => {});
  });
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5));
      if (!window.localStorage.getItem("grimorio.edizione")) window.localStorage.setItem("grimorio.edizione", "2024");
    } catch { /* no storage */ }
  });
});

test("a visitor: nothing of «I mostri creati da voi» (switch off): no card, no category, 404 pages and sheets, 403 API", async ({ page, request }) => {
  const html = await (await request.get("/bestiario")).text();
  expect(html).not.toMatch(/creati da voi|Dalla community|data-originals-tile="community"/i);
  for (const path of ["/bestiario/creati-da-voi", "/bestiario/proponi", `/mostro/${COMMUNITY_ID}`, `/mostro/${OURS_ID}`]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
    expect(await response.text(), path).not.toMatch(/Viverna di cenere|Custode di sale|Proponi un mostro|creati da voi/i);
  }
  const token = await request.get("/api/proposte");
  expect(token.status()).toBe(403);
  const sent = await request.post("/api/proposte", { headers: { origin: "http://127.0.0.1:3100", "content-type": "application/json" }, data: { scheda: { edizione: "2024" }, nickname: "Bot" } });
  expect(sent.status()).toBe(403);
  expect((await (await request.get("/api/catalogo/bestiario")).json()).monsters.some(monster => monster.homebrew)).toBe(false);
  const index = await (await request.get("/ricerca-indice.json")).text();
  expect(index).not.toMatch(/homebrew-|Dalla community|Dalla redazione/);

  await page.goto("/bestiario");
  await expect(page.getByRole("searchbox", { name: "Cerca una creatura" })).toBeVisible();
  await expect(page.locator("[data-originals-tile=community]")).toHaveCount(0);
  await page.getByRole("button", { name: /^Filtri/ }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: /^Mostra \d+ risultat/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Creati da voi/ })).toHaveCount(0);
  expect(await page.content()).not.toMatch(/creati da voi/i);
});

test("the administrator: card (N > 0 and N = 0), section with chips, pills and sheets, all with «Nascosta»", async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/bestiario");
  if ((await editionPill(page).getAttribute("aria-label")).slice(9, 13) !== "2024") await chooseEdition(page, "2024");
  // PROMPT 25: the tile «Creati da voi» of «Creature originali» (the community only; ours is «Mostri del Grimorio»).
  const card = page.locator("[data-originals-block]").filter({ visible: true }).locator("[data-originals-tile=community]");
  await expect(card).toBeVisible();
  await expect(card.locator("[data-originals-count]")).toHaveAttribute("data-originals-count", "1");
  await expect(card).toContainText("Nascosta");
  await expect(card).toHaveCSS("background-color", "rgb(43, 33, 24)");
  await expect(card.locator("[data-originals-link]")).toHaveAttribute("href", "/bestiario/creati-da-voi");
  await expect(card.getByRole("link", { name: "Proponi il tuo" })).toHaveAttribute("href", "/bestiario/proponi");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/1-bestiario-card-390.png` });
  // The category «Creati da voi» of the filters leads to the same list.
  await page.getByRole("button", { name: /^Filtri/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Creati da voi · Nascosta" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /^Mostra \d+ risultat/ }).click();
  await expect(page).toHaveURL(/\/bestiario\/creati-da-voi$/);

  // The section: header, three steps, chips, rows with their pills.
  await expect(page.locator("[data-community-switch=off]")).toContainText("Nascosta");
  await expect(page.getByRole("heading", { name: "I mostri creati da voi", level: 1 })).toHaveCSS("font-size", "36px");
  await expect(page.getByRole("link", { name: "Proponi un mostro" })).toHaveAttribute("href", "/bestiario/proponi");
  await expect(page.locator("[data-community-steps] li")).toHaveCount(3);
  await page.goto("/bestiario/creature-originali");
  await expect(page.locator("[data-community-chip]")).toHaveText(["Tutte · 2", "Dalla redazione · 1", "Dalla community · 1"]);
  const row = id => page.locator("li.catalog-row").filter({ has: page.locator(`a[href="/mostro/${id}"]`) });
  await expect(row(COMMUNITY_ID).locator("[data-homebrew-pill=community]")).toHaveText("Dalla community");
  await expect(row(COMMUNITY_ID).locator("[data-homebrew-pill=community]")).toHaveCSS("background-color", "rgb(246, 227, 176)");
  await expect(row(COMMUNITY_ID)).toContainText("di Lia");
  await expect(row(OURS_ID).locator("[data-homebrew-pill=grimorio]")).toHaveText("Dalla redazione");
  await expect(row(OURS_ID).locator("[data-homebrew-pill=grimorio]")).toHaveCSS("background-color", "rgb(122, 31, 43)");
  await expect(row(OURS_ID).locator("[data-homebrew-author]")).toHaveCount(0);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/2-sezione-390.png`, fullPage: true });
  await page.locator('[data-community-chip="grimorio"]').click();
  await expect(page.locator("li.catalog-row")).toHaveCount(1);
  await expect(row(OURS_ID)).toHaveCount(1);
  await page.locator('[data-community-chip="tutti"]').click();
  // The search of the Bestiario works here too.
  await page.getByRole("searchbox", { name: "Cerca una creatura" }).fill("viverna");
  await expect(page.locator("li.catalog-row")).toHaveCount(1);

  // The sheets: «Proposta da Lia» in bold, the licence and «controllata dal Grimorio»; ours, «Mostro originale…».
  await row(COMMUNITY_ID).locator("a").first().click();
  await expect(page.getByRole("heading", { name: "Viverna di cenere", level: 1 })).toBeVisible();
  await expect(page.locator("[data-community-switch=off]").first()).toBeVisible();
  await expect(page.locator("[data-homebrew-pill=community]")).toBeVisible();
  await expect(page.locator("[data-homebrew-byline=community]")).toHaveText("Proposta da Lia");
  await expect(page.locator("[data-homebrew-byline=community]")).toHaveCSS("font-weight", "700");
  await expect(page.locator("[data-homebrew-license]")).toHaveText("Licenza CC BY-NC-SA 4.0 · controllata dal Grimorio");
  await expect(page.getByRole("button", { name: "Torna indietro" })).toContainText("I mostri creati da voi");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/4-scheda-390.png` });
  await page.getByRole("button", { name: "Torna indietro" }).click();
  await expect(page).toHaveURL(/\/bestiario\/creature-originali$/);
  await page.goto(`/mostro/${OURS_ID}`);
  await expect(page.locator("[data-homebrew-pill=grimorio]")).toHaveText("Dalla redazione");
  await expect(page.locator("[data-homebrew-byline=grimorio]")).toHaveText("Mostro originale, bilanciato sui mostri ufficiali dello stesso GS");
  // The box of PROMPT 12 stays on these sheets.
  await expect(page.locator("[data-balance-box]")).toBeVisible();

  // N = 0: in 2014 no creature yet, only «Proponi il tuo».
  await page.goto("/bestiario");
  await chooseEdition(page, "2014");
  await expect(card.locator("[data-originals-count]")).toHaveAttribute("data-originals-count", "0");
  await expect(card.getByRole("link", { name: "Proponi il tuo" })).toBeVisible();
  await chooseEdition(page, "2024");
  // Computer: the section opens on the right.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/bestiario/creati-da-voi");
  await expect(page.locator("[data-community-header]").filter({ visible: true })).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/2-sezione-1280.png` });
});

for (const [width, edition] of [[390, "2024"], [1280, "2014"], [390, "2014"], [1280, "2024"]]) {
  test(`the form in four steps (${width}, ${edition}): chips, senses, draft kept, preview, sending, the proposal reaches the administrator`, async ({ page }) => {
    test.setTimeout(120_000);
    await database(client => client.query("DELETE FROM grimorio_homebrew_limits").catch(() => {}));
    await login(page);
    await page.setViewportSize({ width, height: 900 });
    const nome = `Basilisco di prova ${width} ${edition}`;
    await page.goto("/bestiario/proponi");
    await page.evaluate(() => localStorage.removeItem("grimorio.proposta-bozza"));
    await page.reload();
    await expect(page.locator("[data-community-switch=off]")).toBeVisible();
    // Step 1, Identità: one segment of four in bordeaux.
    await expect(page.locator("[data-progress] li")).toHaveCount(4);
    await expect(page.locator("[data-progress] li[data-progress-done]")).toHaveCount(1);
    await page.getByRole("group", { name: "Edizione della scheda" }).getByRole("button", { name: edition, exact: true }).click();
    await page.locator("#hb-nome").fill(nome);
    await page.locator("#hb-tipo").selectOption("Mostruosità");
    await page.locator("#hb-ca").fill("14");
    await page.locator("#hb-pf").fill("52");
    await page.locator("#hb-gs").selectOption("3");
    await page.locator("#hb-saggezza").fill("14");
    await expect(page.locator("[data-proposal-bar]")).toBeVisible();
    await page.getByRole("button", { name: "Avanti: Difese e sensi" }).click();

    // Step 2, Difese e sensi: chips with ✓ and the bordeaux border, senses with their distance, languages.
    await expect(page.locator("[data-progress] li[data-progress-done]")).toHaveCount(2);
    const resistances = page.locator('[data-chip-field="hb-resistenze"]');
    await resistances.getByRole("button", { name: "freddo" }).click();
    await resistances.getByRole("button", { name: "necrotico" }).click();
    await expect(resistances.getByRole("button", { name: "freddo" })).toHaveAttribute("aria-pressed", "true");
    await expect(resistances.getByRole("button", { name: "freddo" })).toHaveCSS("border-color", "rgb(122, 31, 43)");
    await resistances.getByRole("button", { name: "necrotico" }).click();
    await resistances.getByRole("button", { name: "necrotico" }).click();
    await page.locator('[data-chip-field="hb-immunita-condizioni"]').getByRole("button", { name: "avvelenato" }).click();
    await page.locator("[data-add-sense]").click();
    await page.getByLabel("Distanza di scurovisione").selectOption("36");
    await page.locator("[data-add-sense]").click();
    await expect(page.locator("[data-sense-row]")).toHaveCount(2);
    await expect(page.locator("[data-passive-perception]")).toHaveText("Percezione passiva 12 · calcolata da sola");
    const languages = page.locator('[data-chip-field="hb-linguaggi"]');
    await languages.getByRole("button", { name: "Comune", exact: true }).click();
    await languages.getByRole("button", { name: "Draconico" }).click();
    await page.getByLabel(/^Altra/).fill("telepatia 36 m");

    // The draft stays on the device: after a reload the same step and the same choices.
    await page.reload();
    await expect(page.locator("[data-progress] li[data-progress-done]")).toHaveCount(2);
    await expect(resistances.getByRole("button", { name: "necrotico" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-sense-row]")).toHaveCount(2);
    // Back to step 1 without losing anything, then on.
    await page.locator("[data-step-back]").click();
    await expect(page.locator("#hb-nome")).toHaveValue(nome);
    await page.getByRole("button", { name: "Avanti: Difese e sensi" }).click();
    await expect(page.getByLabel("Distanza di scurovisione")).toHaveValue("36");
    await page.getByRole("button", { name: "Avanti: Azioni" }).click();

    // Step 3, Azioni, then the preview of the sheet.
    await page.locator("#hb-azioni-0-nome").fill("Sguardo");
    await page.locator("#hb-azioni-0-testo").fill(edition === "2014"
      ? "Attacco con arma da mischia: +5 al tiro per colpire, portata 1,5 m, un bersaglio. Colpito: 10 (2d6 + 3) danni perforanti."
      : "Tiro per colpire in mischia: +5, portata 1,5 m. Colpito: 10 (2d6 + 3) danni perforanti.");
    await page.locator("[data-proposal-preview]").click();
    const preview = page.locator("[data-homebrew-preview]");
    await expect(preview.getByRole("heading", { name: nome })).toBeVisible();
    await expect(preview).toContainText("freddo, necrotico");
    await expect(preview).toContainText("scurovisione 36 m");
    await expect(preview).toContainText("Comune, Draconico, telepatia 36 m");
    if (SHOTS && width === 390 && edition === "2024") await page.screenshot({ path: `${SHOTS}/3-anteprima-390.png` });
    await page.locator("[data-proposal-preview]").click();
    await page.getByRole("button", { name: "Avanti: Invio" }).click();

    // Step 4, Invio: summary, author, licence, sending.
    await expect(page.locator("[data-progress] li[data-progress-done]")).toHaveCount(4);
    await expect(page.locator("[data-proposal-summary]")).toContainText(nome);
    await page.getByLabel("Nickname *").fill(`Prova passi ${width}`);
    await page.getByLabel("È una mia creazione originale, non copiata da manuali o siti.").check();
    await page.getByLabel(/^Pubblico la creatura con licenza CC BY-NC-SA 4\.0/).check();
    if (SHOTS && width === 390 && edition === "2024") await page.screenshot({ path: `${SHOTS}/3-modulo-invio-390.png`, fullPage: true });
    await page.getByRole("button", { name: "Invia la proposta" }).click();
    await expect(page.getByText("Grazie! L’amministratore la guarderà presto.")).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("grimorio.proposta-bozza"))).toBeNull();

    // The proposal reaches the administrator, with the text written by the chips.
    await page.goto("/admin/proposte");
    const proposal = page.locator("li[data-proposal]").filter({ has: page.getByText(nome, { exact: true }) });
    await expect(proposal).toContainText(`di Prova passi ${width}`);
    const saved = await database(client => client.query("SELECT scheda FROM grimorio_homebrew_proposals WHERE scheda->>'nome' = $1", [nome]));
    expect(saved.rows[0].scheda).toMatchObject({ edizione: edition, resistenze: "freddo, necrotico", immunita_condizioni: "avvelenato", linguaggi: "Comune, Draconico, telepatia 36 m" });
    expect(saved.rows[0].scheda.sensi).toMatch(/^scurovisione 36 m, (vista cieca|percezione tellurica|vista pura) 18 m$/);
  });
}

test("/admin/sezioni: «I mostri creati da voi» shows its real state, «Spenta dall’interruttore», buttons locked, counted as hidden", async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/admin/sezioni");
    const bestiario = page.locator('[data-section-row="bestiario"]');
    // The summary of the Bestiario and the count at the top take it as hidden.
    await expect(bestiario.locator("[data-parts-summary]")).toContainText("1 parte non visibile: I mostri creati da voi");
    await expect(page.getByText(/^\d+ (parte nascosta|parti nascoste)$/)).toBeVisible();
    await bestiario.locator("[data-parts-summary]").click();
    const row = page.locator('[data-part-row="bestiario:homebrew"]');
    await expect(row).toContainText("I mostri creati da voi");
    await expect(row.locator("[data-switch-off]")).toHaveText("Spenta dall’interruttore");
    await expect(row.locator("[data-switch-off]")).toHaveCSS("background-color", "rgb(228, 224, 219)");
    await expect(row).toContainText("Si accende solo con un nuovo deploy: chiedi il prompt di accensione");
    const group = row.getByRole("radiogroup", { name: "Stato di I mostri creati da voi" });
    await expect(group).toHaveAttribute("aria-disabled", "true");
    for (const label of ["Visibile", "In arrivo", "Nascosta"]) {
      await expect(group.getByRole("radio", { name: label })).toBeDisabled();
      await expect(group.getByRole("radio", { name: label })).toHaveAttribute("aria-disabled", "true");
    }
    // The other parts of the Bestiario keep working buttons.
    await expect(page.locator('[data-part-row="bestiario:animali"]').getByRole("radio", { name: "Nascosta" })).toBeEnabled();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/5-sezioni-${width}.png`, fullPage: width === 390 });
  }
});
