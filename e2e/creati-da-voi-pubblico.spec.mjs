import { test, expect } from "@playwright/test";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";

// «I mostri creati da voi» with the switch on (e2e/run.mjs builds it with GRIMORIO_COMMUNITY_TEST_PUBLIC=on, tests
// only): what the visitors will see once Daniele turns it on. Local test database only.
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

  // Clean up: the community row from the database, ours with the bin of the reserved area (the lists refreshed again).
  await database(client => client.query("DELETE FROM grimorio_homebrew WHERE id = $1", [COMMUNITY_ID]));
  await admin.getByPlaceholder("Cerca per nome o tipo…").fill("custode pubblico");
  admin.once("dialog", dialog => dialog.accept());
  await admin.locator("main ul li[data-card-row]").filter({ hasText: "Custode pubblico" }).dispatchEvent("contextmenu");
  await admin.locator("[data-row-menu]").getByRole("button", { name: "Elimina" }).click();
  await expect.poll(async () => (await (await request.get("/api/catalogo/bestiario")).json()).monsters.some(monster => monster.homebrew)).toBe(false);
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
  // A real change, then back.
  await group.getByRole("radio", { name: "Nascosta" }).click();
  await expect(page.getByRole("status").filter({ hasText: "I mostri creati da voi ora è nascosta" })).toBeVisible();
  await group.getByRole("radio", { name: "Visibile" }).click();
  await expect(page.getByRole("status").filter({ hasText: "I mostri creati da voi ora è visibile" })).toBeVisible();
});
