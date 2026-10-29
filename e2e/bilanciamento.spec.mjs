import { test, expect } from "@playwright/test";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";

// Bilanciamento (PROMPT 11, 12): the administrator sees the box only under our sheets (a homebrew, a sheet made in the
// reserved area; phone and computer), in the editor on «Ricalcola» and in /admin/bilanciamento; never under an official
// sheet (SRD 2024 and 2014). A visitor never, not even in the HTML.
// Two sheets made «in the reserved area» and one homebrew are written only in the local test database, then deleted.
const SHOTS = process.env.BILANCIAMENTO_SHOTS;
const BITE = (bonus, average, dice) => `<strong>Morso.</strong> <em>Tiro per colpire in mischia:</em> +${bonus}, portata 1,5 m. <em>Colpito:</em> ${average} (${dice}) danni perforanti.`;
const MADE = [
  ["prova-bilanciamento-guardiano", "Guardiano di prova", "2", "13", "45 (6d8 + 18)", `<strong>Multiattacco.</strong> Il guardiano effettua due attacchi Morso.<br><br>${BITE(4, 9, "2d6 + 2")}`],
  ["prova-bilanciamento-colosso", "Colosso di prova", "1", "18", "300 (24d12 + 144)", `<strong>Multiattacco.</strong> Il colosso effettua quattro attacchi Morso.<br><br>${BITE(12, 40, "6d10 + 7")}`],
];

const HOMEBREW_ID = "homebrew-prova-bilanciamento";
const HOMEBREW = {
  edizione: "2024", nome: "Drago di prova", taglia: "Grande", tipo: "Drago", allineamento: "caotico neutrale", ca: 16, ca_nota: "", pf: 110, dadi_vita: "13d10 + 39",
  velocita: "12 m", forza: 19, destrezza: 14, costituzione: 17, intelligenza: 12, saggezza: 13, carisma: 15, ts_competenti: ["destrezza"],
  abilita: "", vulnerabilita: "", resistenze: "", immunita_danni: "", immunita_condizioni: "", sensi: "", linguaggi: "Comune", habitat: [], grado_sfida: "7",
  tratti: [{ nome: "Rigenerazione", testo: "Il drago recupera 10 punti ferita all'inizio di ogni suo turno." }],
  azioni: [{ nome: "Multiattacco", testo: "Il drago effettua due attacchi Morso." }, { nome: "Morso", testo: "Tiro per colpire in mischia: +7, portata 3 m. Colpito: 15 (2d10 + 4) danni perforanti." }],
  azioni_bonus: [], reazioni: [], azioni_leggendarie: [],
};

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
    for (const [id, nome, gs, ca, pf, azioni] of MADE)
      await client.query(`INSERT INTO monsters (id, nome, tipo, taglia, grado_sfida, classe_armatura, punti_ferita, forza, azioni, sort_key)
        VALUES ($1,$2,'Costrutto','Media',$3,$4,$5,16,$6,$7) ON CONFLICT (id) DO NOTHING`, [id, nome, gs, ca, pf, azioni, nome.toLowerCase()]);
    // The same table lib/homebrew.ts makes on first use.
    await client.query(`CREATE TABLE IF NOT EXISTS grimorio_homebrew (id text PRIMARY KEY, scheda jsonb NOT NULL,
      edizione text NOT NULL CHECK (edizione IN ('2014', '2024', 'entrambe')), autore text, proposta_id uuid,
      pubblicata_il timestamptz NOT NULL DEFAULT now(), aggiornata_il timestamptz NOT NULL DEFAULT now(), licenza text)`);
    await client.query("INSERT INTO grimorio_homebrew (id, scheda, edizione, autore) VALUES ($1, $2, '2024', 'Prova') ON CONFLICT (id) DO NOTHING", [HOMEBREW_ID, JSON.stringify(HOMEBREW)]);
  });
});
test.afterAll(async () => {
  await database(async client => {
    await client.query("DELETE FROM monsters WHERE id LIKE 'prova-bilanciamento-%'");
    await client.query("DELETE FROM grimorio_homebrew WHERE id = $1", [HOMEBREW_ID]);
  });
});

test("administrator: no box under the official sheets (SRD 2024 and 2014), the API computes nothing for them", async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    await page.setViewportSize(viewport);
    for (const id of ["drago-nero-adulto", "troll-2014"]) {
      await page.goto(`/mostro/${id}`);
      // The administrator is recognised (the «Modifica» button), yet no box comes.
      await expect(page.locator("[data-admin-edit]").filter({ visible: true }).first()).toBeVisible();
      await page.waitForLoadState("networkidle");
      await expect(page.locator("[data-balance-box]"), `${id} ${viewport.width}`).toHaveCount(0);
      await expect(page.locator("[data-admin-monster-panel]")).toHaveCount(0);
    }
  }
  const official = await page.request.get("/api/admin/pannello-mostro?id=drago-nero-adulto");
  expect(official.status()).toBe(422);
  expect((await official.json()).error).toBe("Non previsto per le schede ufficiali");
  // The editor of an official sheet has no «Bilanciamento» section.
  await page.goto("/admin/mostri/drago-nero-adulto");
  await expect(page.locator("#grado_sfida").first()).toBeAttached();
  await expect(page.locator("[data-editor-balance]")).toHaveCount(0);
});

test("administrator: the box under our sheets, a homebrew and a sheet made here, phone and computer", async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    await page.setViewportSize(viewport);
    for (const [id, level, result] of [[HOMEBREW_ID, 7, null], ["prova-bilanciamento-colosso", 1, "fuori"]]) {
      await page.goto(`/mostro/${id}`);
      const box = page.locator("[data-balance-box]");
      await expect(box, `${id} ${viewport.width}`).toBeVisible();
      await expect(box).toContainText("BILANCIAMENTO");
      await expect(box.locator("[data-balance-row]")).toHaveCount(3);
      for (const label of ["Danni ai PG per round", "Round che resiste", "PG a terra (% scontri)"]) await expect(box).toContainText(label);
      await expect(box.locator("[data-balance-verdict]")).toHaveCount(3);
      await expect(box.locator("[data-balance-row]").first()).toContainText("fascia 10–90:");
      await expect(box).toContainText(`Simulazione contro 4 PG di livello ${level}`);
      await expect(box).toContainText("mostri SRD 2024");
      await expect(box.locator("[data-balance-typical]")).toContainText("Valori tipici per questo GS");
      await expect(box.locator("[data-balance-result]")).toHaveAttribute("data-balance-result", /^(in-linea|da-controllare|fuori)$/);
      await expect(box.locator("[data-balance-level]")).toHaveText(/^(In linea|Da controllare|Fuori dal GS)$/);
      if (result) {
        await expect(box.locator("[data-balance-result]")).toHaveAttribute("data-balance-result", result);
        await expect(box.locator("[data-balance-level]")).toHaveText("Fuori dal GS");
        await expect(box.locator("[data-balance-level]")).toHaveCSS("background-color", "rgb(122, 31, 43)");
        await expect(box.locator("[data-balance-result]")).toContainText("Picchia più dei mostri del suo GS");
      }
      await expect(box).toHaveCSS("border-style", "dashed");
      await expect(box).toHaveCSS("background-color", "rgb(252, 239, 208)");
      // Under the sheet, inside the width of the page.
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      if (SHOTS) await box.screenshot({ path: `${SHOTS}/1-riquadro-${id === HOMEBREW_ID ? "homebrew" : "colosso"}-${viewport.width}.png` });
    }
  }
});

test("administrator: /admin/bilanciamento by verdict with its filter, and the editor on «Ricalcola»", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.goto("/admin");
  await page.getByRole("link", { name: /Bilanciamento/ }).click();
  await expect(page).toHaveURL(/\/admin\/bilanciamento$/);
  const items = page.locator("[data-balance-item]");
  await expect(items.first()).toHaveAttribute("data-balance-item", "prova-bilanciamento-colosso");
  await expect(page.locator('[data-balance-item="prova-bilanciamento-colosso"] [data-balance-outcome]')).toHaveAttribute("data-balance-outcome", "fuori");
  await expect(page.locator('[data-balance-item="prova-bilanciamento-guardiano"]')).toContainText("Creata qui · GS 2 · 2024");
  await expect(page.locator(`[data-balance-item="${HOMEBREW_ID}"]`)).toContainText("Creati da voi · GS 7 · 2024");
  // Only our sheets: no SRD monster in the list.
  await expect(page.locator('[data-balance-item="drago-nero-adulto"], [data-balance-item="troll"]')).toHaveCount(0);
  // The order: «Fuori dal GS», then «Da controllare», then «In linea».
  const order = { fuori: 0, "da-controllare": 1, "in-linea": 2, "non-simulabile": 3 };
  const outcomes = await page.locator("[data-balance-outcome]").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-balance-outcome")));
  expect(outcomes.map(outcome => order[outcome])).toEqual([...outcomes.map(outcome => order[outcome])].sort((a, b) => a - b));
  if (SHOTS) await page.locator("[data-balance-page]").screenshot({ path: `${SHOTS}/2-pagina-bilanciamento.png` });
  // The filter: «Fuori» keeps only the sheets out of their CR.
  await page.locator('[data-balance-filter="fuori"]').click();
  await expect(page).toHaveURL(/filtro=fuori$/);
  await expect(page.locator('[data-balance-filter="fuori"]')).toHaveAttribute("aria-current", "page");
  await expect(page.locator('[data-balance-item="prova-bilanciamento-colosso"]')).toBeVisible();
  const kept = await page.locator("[data-balance-outcome]").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-balance-outcome")));
  expect(kept.every(outcome => outcome === "fuori")).toBe(true);
  await page.locator('[data-balance-filter="tutti"]').click();
  await expect(page).toHaveURL(/\/admin\/bilanciamento$/);
  await expect(page.locator(`[data-balance-item="${HOMEBREW_ID}"]`)).toBeVisible();
  // The editor: nothing until «Ricalcola», then the box of the sheet as written.
  await page.goto("/admin/mostri/prova-bilanciamento-guardiano");
  const section = page.locator("[data-editor-balance]").filter({ visible: true }).first();
  await expect(section).toBeVisible();
  await expect(section.locator("[data-balance-box]")).toHaveCount(0);
  await section.getByRole("button", { name: "Ricalcola" }).click();
  await expect(section.locator("[data-balance-box]")).toBeVisible();
  await expect(section.locator("[data-balance-box]")).toContainText("Simulazione contro 4 PG di livello 2");
  // A change in the form, then «Ricalcola» again: a CR of 10 is compared with level 10.
  // The editor can be in the page twice for a moment (as the section above): the visible field.
  await page.locator("#grado_sfida").filter({ visible: true }).first().selectOption("10");
  await section.getByRole("button", { name: "Ricalcola" }).click();
  await expect(section.locator("[data-balance-box]")).toContainText("Simulazione contro 4 PG di livello 10");
  // Nothing was saved: the page of the sheet still shows CR 2.
  await page.goto("/mostro/prova-bilanciamento-guardiano");
  await expect(page.locator("[data-balance-box]")).toContainText("livello 2");
});

test("a visitor: no box, no word of it in the HTML, the API refuses", async ({ browser, request }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  for (const id of ["drago-nero-adulto", "troll-2014", "prova-bilanciamento-colosso", HOMEBREW_ID]) {
    const response = await request.get(`/mostro/${id}`);
    expect([200, 404], id).toContain(response.status());
    expect(await response.text()).not.toMatch(/Bilanciamento|BILANCIAMENTO|data-balance/);
    await page.goto(`/mostro/${id}`);
    await page.waitForTimeout(500);
    await expect(page.locator("[data-balance-box]")).toHaveCount(0);
  }
  const api = await request.get("/api/admin/pannello-mostro?id=drago-nero-adulto");
  expect(api.status()).toBe(401);
  expect(api.headers()["cache-control"]).toBe("private, no-store");
  const list = await request.get("/admin/bilanciamento");
  expect(await list.text()).not.toMatch(/Colosso di prova|Drago di prova|data-balance-list/);
  const filtered = await request.get("/admin/bilanciamento?filtro=fuori");
  expect(await filtered.text()).not.toMatch(/Colosso di prova|data-balance-list|data-balance-filters/);
  await context.close();
});
