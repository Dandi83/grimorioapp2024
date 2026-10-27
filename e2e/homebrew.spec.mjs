import { chooseEdition, editionPill } from "./edition-pill.mjs";
import { test, expect } from "@playwright/test";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";

// Homebrew creatures: proposals of the community, approval, the Homebrew collection. Local test database only.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5));
      // A visitor who has already chosen «la tua edizione» (2024): the first launch has its own test (e2e/edizione.spec.mjs).
      if (!window.localStorage.getItem("grimorio.edizione")) window.localStorage.setItem("grimorio.edizione", "2024");
    } catch { /* no storage */ }
  });
});

const CARD = "/mostro/homebrew-drago-di-nebbia";
const LICENSE = "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.it";
const SHOTS = process.env.HOMEBREW_SHOTS;
const LICENSE_BOX = /^Pubblico la creatura con licenza CC BY-NC-SA 4\.0 e autorizzo Il Grimorio\.App a pubblicarla e a modificarla, come spiegato nei Termini d’uso/;

async function propose(page, { nome, edizione, azione, nickname, email }) {
  await page.goto("/bestiario/proponi");
  await page.getByRole("group", { name: "Edizione della scheda" }).getByRole("button", { name: edizione, exact: true }).click();
  await page.locator("#hb-nome").fill(nome);
  await page.locator("#hb-taglia").selectOption("Grande");
  await page.locator("#hb-tipo").selectOption("Drago");
  await page.locator("#hb-ca").fill("16");
  await page.locator("#hb-pf").fill("110");
  await page.locator("#hb-dadi").fill("13d10 + 39");
  await page.locator("#hb-gs").selectOption("7");
  await page.locator("#hb-azioni-0-nome").fill("Morso");
  await page.locator("#hb-azioni-0-testo").fill(azione);
  await page.getByLabel("Nickname *").fill(nickname);
  if (email) await page.getByLabel("Email (facoltativa)").fill(email);
  await page.getByLabel("È una mia creazione originale, non copiata da manuali o siti.").check();
  await page.getByLabel(LICENSE_BOX).check();
  // Both links of the box open a new tab: the form being filled stays.
  await expect(page.getByRole("link", { name: "Termini d’uso" })).toHaveAttribute("href", "/termini");
  await expect(page.getByRole("link", { name: "Termini d’uso" })).toHaveAttribute("target", "_blank");
  await expect(page.getByRole("link", { name: "CC BY-NC-SA 4.0" })).toHaveAttribute("href", LICENSE);
  await expect(page.getByRole("link", { name: "CC BY-NC-SA 4.0" })).toHaveAttribute("target", "_blank");
  await page.getByRole("button", { name: "Invia la proposta" }).click();
}

test("homebrew: proposal sent, reviewed and approved or refused, Homebrew collection in both editions, search, card, eyes, antispam and limits", async ({ page, request, browser }) => {
  test.setTimeout(240_000);
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  const before = { api: await (await request.get("/api/catalogo/bestiario")).text(), index: await (await request.get("/ricerca-indice.json")).text() };
  expect(JSON.parse(before.api).monsters.some(monster => monster.homebrew)).toBe(false);

  // No homebrew creature published yet: no empty «Homebrew» filter, the way to propose one is under the list.
  await page.goto("/bestiario");
  await page.getByRole("button", { name: /^Filtri/ }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: /^Mostra \d+ risultat/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Homebrew", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.locator("[data-propose-homebrew]").getByRole("link", { name: "Proponila per la raccolta Homebrew" }).click();
  await expect(page).toHaveURL("/bestiario/proponi");

  // The form adapts to the edition and suggests the other format, never blocking.
  await page.getByRole("group", { name: "Edizione della scheda" }).getByRole("button", { name: "2014", exact: true }).click();
  await expect(page.locator("[data-initiative]")).toHaveCount(0);
  await page.locator("#hb-azioni-0-testo").fill("Tiro per colpire in mischia: +7, portata 3 m. Colpito: 15 (2d10 + 4) danni perforanti.");
  await expect(page.locator("[data-format-hint]")).toContainText("«Tiro per colpire in mischia»: è il formato del 2024");
  await page.locator("[data-format-hint]").getByRole("button", { name: "Passa a 2024" }).click();
  await expect(page.locator("[data-format-hint]")).toHaveCount(0);
  await expect(page.locator("[data-initiative]")).toContainText("+0 (10)");
  await expect(page.locator("[data-cr-check]")).toBeVisible();

  // Without the box of the licence the form is not sent (checked in the browser and again by the server).
  await page.locator("#hb-nome").fill("Senza licenza");
  await page.locator("#hb-azioni-0-nome").fill("Morso");
  await page.locator("#hb-azioni-0-testo").fill("Tiro per colpire in mischia: +4, portata 1,5 m. Colpito: 7 (2d4 + 2) danni perforanti.");
  await page.getByLabel("Nickname *").fill("Lia");
  await page.getByLabel("È una mia creazione originale, non copiata da manuali o siti.").check();
  await expect(page.getByLabel(LICENSE_BOX)).not.toBeChecked();
  await page.getByRole("button", { name: "Invia la proposta" }).click();
  await expect(page.getByText("Pubblica la creatura con licenza CC BY-NC-SA 4.0 e autorizza Il Grimorio.App a pubblicarla e a modificarla.")).toBeVisible();
  await expect(page.getByText("Grazie! L’amministratore la guarderà presto.")).toHaveCount(0);

  // Three proposals from this device: one for both editions with an email, one to refuse, one more; the fourth is refused by the limit.
  await propose(page, { nome: "Drago di nebbia", edizione: "Entrambe", nickname: "Master Ombra", email: "master@esempio.it",
    azione: "Tiro per colpire in mischia: +7, portata 3 m. Colpito: 15 (2d10 + 4) danni perforanti." });
  await expect(page.getByText("Grazie! L’amministratore la guarderà presto.")).toBeVisible();
  expect((await request.get(CARD)).status(), "nothing published before the approval").toBe(404);
  await propose(page, { nome: "Abolet", edizione: "2014", nickname: "Copione", email: "c@esempio.it",
    azione: "Tiro per colpire in mischia: +5, portata 1,5 m. Colpito: 9 (2d6 + 2) danni." });
  await expect(page.getByText("Grazie! L’amministratore la guarderà presto.")).toBeVisible();
  await propose(page, { nome: "Lupo di cenere", edizione: "2024", nickname: "Lia",
    azione: "Tiro per colpire in mischia: +4, portata 1,5 m. Colpito: 7 (2d4 + 2) danni perforanti." });
  await expect(page.getByText("Grazie! L’amministratore la guarderà presto.")).toBeVisible();
  await propose(page, { nome: "Quarta creatura", edizione: "2024", nickname: "Lia", azione: "Tiro per colpire in mischia: +4. Colpito: 5 (1d6 + 2) danni." });
  await expect(page.getByText("Hai inviato molte proposte: riprova più tardi.")).toBeVisible();
  // Honeypot and missing time stamp: answered, nothing saved.
  const origin = { origin: "http://127.0.0.1:3100", "content-type": "application/json" };
  const sample = { scheda: { edizione: "2024" }, nickname: "Bot", originale: true, autorizza: true };
  expect((await request.post("/api/proposte", { headers: { "content-type": "application/json" }, data: sample })).status(), "no same-site origin").toBe(403);
  expect((await request.post("/api/proposte", { headers: origin, data: { ...sample, token: "f1.1.x" } })).status(), "invalid sheet").toBe(400);

  // Admin: the review page under «Comune alle due edizioni».
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByRole("link", { name: "Proposte homebrew · 3 da vedere" })).toBeVisible();
  await page.getByRole("link", { name: /Proposte/ }).click();
  await expect(page.getByText("Comune alle due edizioni")).toBeVisible();
  await expect(page.locator("[data-homebrew-section]")).toContainText("Visibile al pubblico");
  await expect(page.getByRole("link", { name: "Da vedere · 3" })).toBeVisible();
  const card = name => page.locator("li[data-proposal]").filter({ has: page.getByText(name, { exact: true }) });
  await expect(card("Drago di nebbia")).toContainText("di Master Ombra");
  await expect(card("Drago di nebbia")).toContainText("Entrambe · GS 7");
  await expect(card("Drago di nebbia")).toContainText("Email lasciata");
  // The licence accepted, saved with the proposal.
  await expect(card("Drago di nebbia").locator("[data-proposal-license]")).toHaveText("Licenza accettata: CC BY-NC-SA 4.0");
  await expect(card("Drago di nebbia")).not.toContainText("Chiedere il consenso alla licenza");
  await expect(card("Abolet")).toContainText("Formato 2024 rilevato");
  await expect(card("Abolet")).toContainText("Nome simile a una creatura del catalogo");
  await expect(card("Abolet").getByText(/GS in linea|Troppo forte|Troppo debole/)).toBeVisible();
  // Anteprima: the public sheet.
  await card("Drago di nebbia").getByRole("link", { name: "Anteprima" }).click();
  await expect(page.getByRole("heading", { name: "Drago di nebbia", level: 1 })).toBeVisible();
  await expect(page.getByText("Proposta da Master Ombra")).toBeVisible();
  await expect(page.locator("[data-homebrew-license]")).toHaveText("Licenza CC BY-NC-SA 4.0");
  await expect(page.getByText("Creatura homebrew, non ufficiale. Non fa parte dell’SRD e non è materiale Wizards of the Coast.")).toBeVisible();
  await page.getByRole("link", { name: "‹ Proposte" }).click();
  // Correggi: the editor already filled in.
  await card("Drago di nebbia").getByRole("button", { name: "Correggi" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("#admin-hb-nome")).toHaveValue("Drago di nebbia");
  await dialog.locator("#admin-hb-velocita").fill("12 m, volo 24 m");
  await dialog.getByRole("button", { name: "Salva" }).click();
  await expect(dialog).toHaveCount(0);
  // Approva and Rifiuta.
  await card("Drago di nebbia").getByRole("button", { name: "Approva" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Pubblicata" })).toContainText("Email non configurata");
  await card("Abolet").getByRole("button", { name: "Rifiuta" }).click();
  await card("Abolet").getByLabel(/Motivo/).fill("Troppo simile all’Aboleth");
  await card("Abolet").getByRole("button", { name: "Conferma il rifiuto" }).click();
  await expect(page.getByRole("link", { name: "Da vedere · 1" })).toBeVisible();
  await page.getByRole("link", { name: "Rifiutate" }).click();
  await expect(page.getByText("Motivo: Troppo simile all’Aboleth")).toBeVisible();
  await page.getByRole("link", { name: "Approvate" }).click();
  await expect(page.getByRole("link", { name: "Apri la scheda pubblicata" })).toHaveAttribute("href", CARD);
  await page.goto("/admin/registro?edizioni=tutte&sezione=mostri");
  await expect(page.getByText("Pubblicata", { exact: true })).toBeVisible();

  // A proposal sent before the licence (the column empty, as on the proposals already in the database):
  // «Licenza non indicata», the amber pill, «Approva» unavailable; then refused, nothing published.
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  await client.query("INSERT INTO grimorio_homebrew_proposals (id, scheda, nickname, originale, autorizza, creata_il) VALUES ('44444444-4444-4444-8444-444444444444', (SELECT scheda FROM grimorio_homebrew_proposals WHERE nickname = 'Lia' LIMIT 1) || '{\"nome\": \"Proposta di prima\"}'::jsonb, 'Vecchio', true, true, now() - interval '1 day')");
  await client.end();
  await page.goto("/admin/proposte");
  await expect(card("Proposta di prima").locator("[data-proposal-license]")).toHaveText("Licenza non indicata");
  await expect(card("Proposta di prima")).toContainText("Chiedere il consenso alla licenza");
  await expect(card("Proposta di prima").getByRole("button", { name: "Approva" })).toBeDisabled();
  if (SHOTS) await card("Proposta di prima").screenshot({ path: `${SHOTS}/proposta-senza-licenza.png` });
  await card("Proposta di prima").getByRole("button", { name: "Rifiuta" }).click();
  await card("Proposta di prima").getByRole("button", { name: "Conferma il rifiuto" }).click();
  await expect(page.getByRole("link", { name: "Da vedere · 1" })).toBeVisible();

  // Public: the card, the collection in both editions, search, API, favorites.
  const visitorContext = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 } });
  await visitorContext.addInitScript(() => { if (!window.localStorage.getItem("grimorio.edizione")) window.localStorage.setItem("grimorio.edizione", "2024"); });
  const visitor = await visitorContext.newPage();
  await expect.poll(async () => (await request.get(CARD)).status()).toBe(200);
  await visitor.goto(CARD);
  await expect(visitor.getByRole("heading", { name: "Drago di nebbia", level: 1 })).toBeVisible();
  await expect(visitor.locator("[data-homebrew-pill]")).toBeVisible();
  await expect(visitor.getByText("Proposta da Master Ombra")).toBeVisible();
  // The licence, small, under the author, with its link.
  await expect(visitor.locator("[data-homebrew-license]")).toHaveText("Licenza CC BY-NC-SA 4.0");
  // Homebrew keeps its own box: no NO SRD origin box (components/card-origin-box.tsx).
  await expect(visitor.locator("[data-card-origin]")).toHaveCount(0);
  await expect(visitor.locator("[data-homebrew-license] a")).toHaveAttribute("href", LICENSE);
  if (SHOTS) await visitor.screenshot({ path: `${SHOTS}/scheda-homebrew-390.png` });
  await expect(visitor.getByText("12 m, volo 24 m").first()).toBeVisible();
  await expect(visitor.getByText("Iniziativa", { exact: true }).first()).toBeVisible();
  await expect(visitor.getByText(/Fonte ufficiale/)).toHaveCount(0);
  await visitor.getByRole("button", { name: "Aggiungi ai preferiti" }).first().click();
  for (const edition of ["2024", "2014"]) {
    await visitor.goto("/bestiario");
    if ((await editionPill(visitor).getAttribute("aria-label")).slice(9, 13) !== edition) await chooseEdition(visitor, edition);
    await visitor.getByRole("searchbox", { name: "Cerca una creatura" }).fill("drago di nebbia");
    await expect(visitor.locator(`a[href="${CARD}"]`), `${edition}: not among the SRD creatures`).toHaveCount(0);
    await visitor.getByRole("button", { name: /^Filtri/ }).click();
    await visitor.getByRole("button", { name: "Homebrew", exact: true }).click();
    await visitor.getByRole("button", { name: /^Mostra \d+ risultat/ }).click();
    // With a published creature the filter is back, with the amber box and «Proponi una creatura».
    await expect(visitor.getByText("Creature create dai master della community. Non sono ufficiali e non fanno parte dell’SRD.")).toBeVisible();
    await expect(visitor.getByRole("link", { name: "Proponi una creatura" })).toHaveAttribute("href", "/bestiario/proponi");
    const row = visitor.locator("li.catalog-row").filter({ has: visitor.locator(`a[href="${CARD}"]`) });
    await expect(row, `${edition}: «Entrambe» in both editions`).toHaveCount(1);
    await expect(row).toContainText("Homebrew");
    await expect(row).toContainText("2014 e 2024");
    await expect(row).toContainText("di Master Ombra");
  }
  await visitor.goto("/preferiti");
  await expect(visitor.locator("li").filter({ hasText: "Drago di nebbia" }).locator("[data-homebrew-pill]")).toBeVisible();
  await expect.poll(async () => (await request.get("/ricerca-indice.json")).text()).toContain(`"${CARD}"`);
  expect((await (await request.get("/api/catalogo/bestiario")).json()).monsters.find(monster => monster.id === "homebrew-drago-di-nebbia")).toMatchObject({ homebrew: true, autore: "Master Ombra", entrambe: true });
  await visitor.goto("/");
  await visitor.getByRole("button", { name: /Cerca/ }).first().click();
  await visitor.getByRole("dialog", { name: "Cerca in tutto il Grimorio" }).getByRole("searchbox").fill("nebbia");
  await expect(visitor.getByRole("link", { name: /Drago di nebbia/ }).locator("[data-homebrew-pill]")).toBeVisible();

  // The eye of the single card (#72) on a homebrew.
  await page.goto("/admin/mostri");
  await page.getByRole("group", { name: "Edizione dell’area riservata" }).getByRole("button", { name: "2024" }).click();
  await expect(page.getByText("Stai modificando il 2024")).toBeVisible();
  await page.getByPlaceholder("Cerca per nome o tipo…").fill("drago di nebbia");
  const adminRow = page.locator("main ul li[data-card-row]").filter({ hasText: "Drago di nebbia" });
  await expect(adminRow.locator("[data-source-label]")).toHaveText("Homebrew · 2014 e 2024");
  await adminRow.getByRole("button", { name: "Nascondi dal sito: Drago di nebbia" }).click();
  await expect.poll(async () => (await request.get(CARD)).status()).toBe(404);
  await adminRow.getByRole("button", { name: "Mostra sul sito: Drago di nebbia" }).click();
  await expect.poll(async () => (await request.get(CARD)).status()).toBe(200);

  // The section eye of /admin/proposte: the whole collection away from the public, then back.
  await page.goto("/admin/proposte");
  await page.getByRole("button", { name: "Nascondi la sezione Homebrew al pubblico" }).click();
  await expect(page.locator("[data-homebrew-section]")).toContainText("Nascosta al pubblico");
  await expect.poll(async () => (await request.get(CARD)).status()).toBe(404);
  expect((await request.get("/bestiario/proponi")).status()).toBe(404);
  expect((await request.get("/api/proposte")).status()).toBe(404);
  expect((await (await request.get("/api/catalogo/bestiario")).json()).monsters.some(monster => monster.homebrew)).toBe(false);
  await expect.poll(async () => (await request.get("/ricerca-indice.json")).text()).not.toContain(`"${CARD}"`);
  await visitor.goto("/bestiario");
  await visitor.getByRole("button", { name: /^Filtri/ }).click();
  await expect(visitor.getByRole("button", { name: "Homebrew", exact: true })).toHaveCount(0);
  await page.goto("/admin/proposte");
  await page.getByRole("button", { name: "Mostra la sezione Homebrew al pubblico" }).click();
  await expect(page.locator("[data-homebrew-section]")).toContainText("Visibile al pubblico");
  await expect.poll(async () => (await request.get(CARD)).status()).toBe(200);

  // «+ Nuova homebrew» of the administrator: «del Grimorio», 2014 only; the bin removes it.
  await page.goto("/admin/mostri");
  await page.getByRole("group", { name: "Edizione dell’area riservata" }).getByRole("button", { name: "2014" }).click();
  await expect(page.getByText("Stai modificando il 2014")).toBeVisible();
  await expect(page.getByText(/Edizione 2014: \d+ incantesimi/)).toBeVisible();
  await page.getByRole("button", { name: "+ Nuova homebrew" }).click();
  const editor = page.getByRole("dialog");
  await expect(editor.getByRole("group", { name: "Edizione della scheda" }).getByRole("button", { name: "2014", exact: true })).toHaveAttribute("aria-pressed", "true");
  await editor.locator("#admin-hb-nome").fill("Guardiano di sale");
  await editor.locator("#admin-hb-azioni-0-nome").fill("Pugno");
  await editor.locator("#admin-hb-azioni-0-testo").fill("Attacco con arma da mischia: +4 al tiro per colpire, portata 1,5 m, un bersaglio. Colpito: 6 (1d8 + 2) danni contundenti.");
  await editor.getByRole("button", { name: "Salva" }).click();
  await expect(editor).toHaveCount(0);
  await expect.poll(async () => (await request.get("/mostro/homebrew-guardiano-di-sale")).status()).toBe(200);
  await visitor.goto("/mostro/homebrew-guardiano-di-sale");
  await expect(visitor.getByText("Creata dal Grimorio")).toBeVisible();
  await expect(visitor.locator("[data-homebrew-license]"), "the Grimorio's own homebrew: the same licence").toHaveText("Licenza CC BY-NC-SA 4.0");
  // As on the SRD 2014 sheets: the initiative box comes from Dexterity, not from the sheet.
  await expect(visitor.getByText("dalla Destrezza").first()).toBeVisible();
  await page.getByPlaceholder("Cerca per nome o tipo…").fill("guardiano di sale");
  page.once("dialog", dialog => dialog.accept());
  await page.locator("main ul li[data-card-row]").filter({ hasText: "Guardiano di sale" }).getByRole("button", { name: "Elimina" }).click();
  await expect.poll(async () => (await request.get("/mostro/homebrew-guardiano-di-sale")).status()).toBe(404);

  // Clean up the published card: lists, index and API as before.
  await page.getByRole("group", { name: "Edizione dell’area riservata" }).getByRole("button", { name: "2024" }).click();
  await expect(page.getByText("Stai modificando il 2024")).toBeVisible();
  await page.getByPlaceholder("Cerca per nome o tipo…").fill("drago di nebbia");
  page.once("dialog", dialog => dialog.accept());
  await page.locator("main ul li[data-card-row]").filter({ hasText: "Drago di nebbia" }).getByRole("button", { name: "Elimina" }).click();
  await expect.poll(async () => (await request.get("/api/catalogo/bestiario")).text()).toBe(before.api);
  await expect.poll(async () => (await request.get("/ricerca-indice.json")).text()).toBe(before.index);
  await visitor.context().close();
  expect(errors).toEqual([]);
});
