import { test, expect } from "./fixtures.mjs";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";

// «Bilanciamento trasparente» (PROMPT 19). Administrator: the box with three tactics, test situations and warnings on
// a homebrew of 2024 and one of 2014, phone and computer; the box «Mostra "Bilanciamento verificato"» at the approval.
// Visitor: the page of the method from its links, the green pill only where it is due, the votes «al tavolo» (one per
// device, changeable, the count from 5), never a number of the simulator in the HTML. Local test database only.
const SHOTS = process.env.TRASPARENTE_SHOTS;
const VERIFIED = "homebrew-prova-verificato";
const UNVERIFIED = "homebrew-prova-paralisi";
const draft = (nome, edizione, extra = {}) => ({
  edizione, nome, taglia: "Grande", tipo: "Drago", allineamento: "caotico neutrale", ca: 16, ca_nota: "", pf: 110, dadi_vita: "13d10 + 39",
  velocita: "12 m", forza: 19, destrezza: 14, costituzione: 17, intelligenza: 12, saggezza: 13, carisma: 15, ts_competenti: ["destrezza"],
  abilita: "", vulnerabilita: "", resistenze: "", immunita_danni: "", immunita_condizioni: "", sensi: "", linguaggi: "Comune", habitat: [], grado_sfida: "7",
  tratti: [], azioni: [{ nome: "Multiattacco", testo: "Il drago effettua due attacchi Morso." }, { nome: "Morso", testo: "Tiro per colpire in mischia: +7, portata 3 m. Colpito: 15 (2d10 + 4) danni perforanti." }],
  azioni_bonus: [], reazioni: [], azioni_leggendarie: [], ...extra,
});
// A 2014 sheet with a paralysing gaze and no new saving throw: the warning «controllo pesante».
const GAZE_2014 = { nome: "Sguardo paralizzante", testo: "Ogni creatura entro 9 metri che possa vedere il drago deve superare un tiro salvezza su Costituzione con CD 15, altrimenti è paralizzata per 1 minuto." };

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

/** A visitor where the statistics are on (localhost, e2e/run.mjs), so the votes are sent. */
async function visitor(browser, width = 390) {
  const base = new URL(test.info().project.use.baseURL);
  base.hostname = "localhost";
  const context = await browser.newContext({ baseURL: base.origin, viewport: { width, height: 900 } });
  await context.addInitScript(() => { try { localStorage.setItem("grimorio.edizione", "2024"); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
  return context;
}

test.beforeAll(async () => {
  // The tables as lib/homebrew.ts makes them on first use, with the columns of PROMPT 19.
  await database(async client => {
    await client.query(`CREATE TABLE IF NOT EXISTS grimorio_homebrew (id text PRIMARY KEY, scheda jsonb NOT NULL,
      edizione text NOT NULL CHECK (edizione IN ('2014', '2024', 'entrambe')), autore text, proposta_id uuid,
      pubblicata_il timestamptz NOT NULL DEFAULT now(), aggiornata_il timestamptz NOT NULL DEFAULT now(), licenza text)`);
    await client.query("ALTER TABLE grimorio_homebrew ADD COLUMN IF NOT EXISTS bilanciamento text");
    await client.query("ALTER TABLE grimorio_homebrew ADD COLUMN IF NOT EXISTS verificato boolean NOT NULL DEFAULT false");
    await client.query(`CREATE TABLE IF NOT EXISTS grimorio_homebrew_proposals (id uuid PRIMARY KEY,
      stato text NOT NULL DEFAULT 'da-vedere' CHECK (stato IN ('da-vedere', 'approvata', 'rifiutata')), scheda jsonb NOT NULL, nickname text NOT NULL,
      email text, originale boolean NOT NULL, autorizza boolean NOT NULL, impronta text, creata_il timestamptz NOT NULL DEFAULT now(),
      decisa_il timestamptz, motivo text, homebrew_id text, licenza text, picco boolean NOT NULL DEFAULT false)`);
  });
  await database(async client => {
    await client.query("INSERT INTO grimorio_homebrew (id, scheda, edizione, autore, licenza, bilanciamento, verificato) VALUES ($1, $2, '2024', 'Lia', 'CC BY-NC-SA 4.0', 'in linea', true) ON CONFLICT (id) DO NOTHING",
      [VERIFIED, JSON.stringify(draft("Drago verificato", "2024"))]);
    await client.query("INSERT INTO grimorio_homebrew (id, scheda, edizione, autore, licenza, bilanciamento, verificato) VALUES ($1, $2, '2014', 'Lia', 'CC BY-NC-SA 4.0', 'fuori', false) ON CONFLICT (id) DO NOTHING",
      [UNVERIFIED, JSON.stringify(draft("Drago paralizzante", "2014", { azioni: [...draft("x", "2014").azioni, GAZE_2014] }))]);
  });
});

test.afterAll(async ({ browser }) => {
  await database(async client => {
    await client.query("DELETE FROM grimorio_homebrew WHERE id = ANY($1)", [[VERIFIED, UNVERIFIED]]);
    await client.query("DELETE FROM grimorio_table_votes").catch(() => {});
    // Every event of the visitors of this file (their page views too): the other tests count people.
    await client.query(`DELETE FROM grimorio_analytics_events WHERE visitor_id IN (SELECT visitor_id FROM grimorio_analytics_events
      WHERE path LIKE '/mostro/homebrew-prova-%' OR path = '/bestiario/creati-da-voi/bilanciamento')`).catch(() => {});
    await client.query("DELETE FROM grimorio_homebrew_proposals WHERE scheda->>'nome' = 'Drago da approvare'");
  });
  // The card published by the approval goes with the bin of the reserved area: the cached lists of the site are refreshed
  // (e2e/homebrew.spec.mjs starts with no creature of «Creati da voi»).
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const admin = await context.newPage();
  await login(admin);
  await admin.goto("/admin/mostri");
  await admin.getByRole("group", { name: "Edizione dell’area riservata" }).getByRole("button", { name: "2024" }).click();
  await admin.getByPlaceholder("Cerca per nome o tipo…").fill("drago da approvare");
  const row = admin.locator("main ul li[data-card-row]").filter({ hasText: "Drago da approvare" });
  if (await row.count()) {
    admin.once("dialog", dialog => dialog.accept());
    await row.dispatchEvent("contextmenu");
    await admin.locator("[data-row-menu]").getByRole("button", { name: "Elimina" }).click();
  }
  await expect.poll(async () => (await (await context.request.get("/api/catalogo/bestiario")).json()).monsters.some(monster => monster.homebrew)).toBe(false);
  await context.close();
});

for (const width of [390, 1280]) {
  test(`administrator (${width}): the box with three tactics, test situations and warnings, on a 2024 and a 2014 homebrew; none on an official sheet`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    await login(page);
    for (const [id, edition] of [[VERIFIED, "2024"], [UNVERIFIED, "2014"]]) {
      await page.goto(`/mostro/${id}`);
      const box = page.locator("[data-balance-box]");
      await expect(box, id).toBeVisible();
      await expect(box.locator("[data-balance-tactic]")).toHaveCount(3);
      await expect(box.locator('[data-balance-tactic="caso"]')).toContainText("A caso");
      await expect(box.locator("[data-balance-situation]")).toHaveCount(7);
      await expect(box.locator("[data-balance-situation]").first()).toContainText("Gruppo di 3 PG");
      await expect(box.locator("[data-balance-sentence]")).toHaveText(/\S/);
      await expect(box.locator("[data-balance-note]")).toContainText(`mostri SRD ${edition}`);
      await expect(box.locator("[data-balance-warnings]")).toBeVisible();
      if (id === UNVERIFIED) await expect(box.locator('[data-balance-warning="controllo:paralizzato"]')).toContainText("paralizzato senza un nuovo tiro salvezza");
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      if (SHOTS) await box.screenshot({ path: `${SHOTS}/riquadro-${edition}-${width}.png` });
    }
    await page.goto("/mostro/drago-nero-adulto");
    await expect(page.locator("[data-admin-edit]").filter({ visible: true }).first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("[data-balance-box]")).toHaveCount(0);
    // /admin/bilanciamento: the warnings and the filter «Con avvisi».
    await page.goto("/admin/bilanciamento?filtro=con-avvisi");
    await expect(page.locator(`[data-balance-item="${UNVERIFIED}"] [data-balance-warning-count]`)).toContainText("Avvisi:");
    const counts = await page.locator("[data-balance-warning-count]").evaluateAll(nodes => nodes.map(node => Number(node.getAttribute("data-balance-warning-count"))));
    expect(counts.length).toBeGreaterThan(0);
    expect(counts.every(count => count > 0)).toBe(true);
  });
}

test("administrator: «Mostra Bilanciamento verificato» at the approval, ticked only with «In linea»; the pill taken away and back", async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await database(client => client.query(
    "INSERT INTO grimorio_homebrew_proposals (id, scheda, nickname, originale, autorizza, licenza) VALUES ($1, $2, 'Bea', true, true, 'CC BY-NC-SA 4.0')",
    [randomUUID(), JSON.stringify(draft("Drago da approvare", "2024"))]));
  await page.goto("/admin/proposte");
  const card = page.locator("[data-proposal]").filter({ hasText: "Drago da approvare" });
  const box = card.locator("[data-verified-box]");
  await expect(box).toContainText("Mostra «Bilanciamento verificato»");
  const verdict = await box.getAttribute("data-verified-box");
  const checkbox = box.getByRole("checkbox");
  if (verdict === "in linea") await expect(checkbox).toBeChecked(); else await expect(checkbox).not.toBeChecked();
  await checkbox.check();
  await card.getByRole("button", { name: "Approva" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Pubblicata" })).toBeVisible();
  const saved = await database(client => client.query("SELECT id, bilanciamento, verificato FROM grimorio_homebrew WHERE scheda->>'nome' = 'Drago da approvare'"));
  expect(saved.rows[0].bilanciamento).toBe(verdict);
  expect(saved.rows[0].verificato).toBe(verdict === "in linea");
  // /admin/bilanciamento: the pill of a verified card taken away, then back.
  await page.goto("/admin/bilanciamento");
  const item = page.locator(`[data-balance-item="${VERIFIED}"]`);
  await expect(item.locator("[data-verified-state]")).toHaveAttribute("data-verified-state", "si");
  await item.getByRole("checkbox", { name: /Mostra «Bilanciamento verificato»/ }).uncheck();
  await expect(item.locator("[data-verified-state]")).toHaveAttribute("data-verified-state", "no");
  const guest = await page.context().browser().newContext({ baseURL: test.info().project.use.baseURL });
  const visitorPage = await guest.newPage();
  await expect.poll(async () => { await visitorPage.goto(`/mostro/${VERIFIED}`); return visitorPage.locator("[data-verified-pill]").count(); }).toBe(0);
  await item.getByRole("checkbox", { name: /Mostra «Bilanciamento verificato»/ }).check();
  await expect(item.locator("[data-verified-state]")).toHaveAttribute("data-verified-state", "si");
  // The box follows the click at once; the pill comes back once the server has saved it.
  await expect.poll(async () => { await visitorPage.goto(`/mostro/${VERIFIED}`); return visitorPage.locator("[data-verified-pill]").count(); }).toBeGreaterThan(0);
  await guest.close();
  // A card out of line: no pill to show.
  const unverified = page.locator(`[data-balance-item="${UNVERIFIED}"]`);
  await expect(unverified.locator("[data-verified-state]")).toContainText("solo con il giudizio salvato «In linea»");
  await expect(unverified.getByRole("checkbox", { name: /Mostra «Bilanciamento verificato»/ })).toBeDisabled();
});

test("visitor: the page of the method from its links, the pill only where due, never a number of the simulator", async ({ browser }) => {
  test.setTimeout(120_000);
  for (const width of [390, 1280]) {
    const context = await visitor(browser, width);
    const page = await context.newPage();
    await page.goto("/bestiario/creati-da-voi");
    await page.locator('[data-method-link="header"]').filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/bestiario\/creati-da-voi\/bilanciamento$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Come valutiamo il bilanciamento");
    await expect(page.locator("[data-method-step]")).toHaveCount(5);
    await expect(page.locator("[data-method-step]").nth(1)).toContainText("3.000 volte");
    await expect(page.locator("[data-method-step]").nth(1)).toContainText("8 mostri ufficiali su 10");
    await expect(page.locator("[data-method-limits]")).toContainText("È una stima seria, non una garanzia. Il giudizio finale resta al master, e al tavolo.");
    await expect(page.getByRole("link", { name: "‹ I mostri creati da voi" })).toHaveAttribute("href", "/bestiario/creati-da-voi");
    await expect(page.locator("[data-method-table]")).toBeHidden();
    await page.locator("[data-method-details] > summary").click();
    await expect(page.locator("[data-method-table] tbody tr")).toHaveCount(20);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/metodo-${width}.png`, fullPage: true });
    await context.close();
  }
  const context = await visitor(browser);
  const page = await context.newPage();
  // From the second step of the form.
  await page.goto("/bestiario/proponi");
  await page.locator("#hb-nome").fill("Prova del link");
  await page.getByRole("button", { name: "Avanti: Difese e sensi" }).click();
  await page.locator('[data-method-link="form"]').getByRole("link").click();
  await expect(page).toHaveURL(/\/bestiario\/creati-da-voi\/bilanciamento$/);
  // The green pill only on the card verified «In linea», to the page of the method.
  await page.goto(`/mostro/${VERIFIED}`);
  const pill = page.locator("[data-verified-pill]");
  await expect(pill).toHaveText("✓ Bilanciamento verificato ›");
  await expect(pill).toHaveCSS("color", "rgb(31, 107, 69)");
  await expect(pill).toHaveCSS("background-color", "rgb(227, 240, 232)");
  await expect(pill).toHaveCSS("border-top-color", "rgb(156, 197, 174)");
  await expect(pill).toHaveAttribute("href", "/bestiario/creati-da-voi/bilanciamento");
  await page.goto(`/mostro/${UNVERIFIED}`);
  await expect(page.locator("[data-verified-pill]")).toHaveCount(0);
  await page.goto("/mostro/drago-nero-adulto");
  await expect(page.locator("[data-verified-pill], [data-table-test]")).toHaveCount(0);
  // Never a number, a verdict or a warning of the simulator in the public HTML.
  for (const path of [`/mostro/${VERIFIED}`, `/mostro/${UNVERIFIED}`, "/bestiario/creati-da-voi/bilanciamento", "/api/catalogo/bestiario", `/api/prove-tavolo?id=${VERIFIED}`]) {
    const body = await (await context.request.get(path)).text();
    expect(body, path).not.toMatch(/data-balance|BILANCIAMENTO|SITUAZIONI DI PROVA|Danni a round|controllo:paralizzato/);
    // The page of the method explains the three verdicts; a card never says its own.
    if (path.startsWith("/mostro/")) expect(body, path).not.toMatch(/Fuori dal GS|Da controllare|In linea/);
  }
  await context.close();
});

test("visitor: «L’hai provato al tavolo?» — a vote, changed, kept; the count from 5 votes; the administrator sees them", async ({ browser }) => {
  test.setTimeout(150_000);
  await database(client => client.query("DELETE FROM grimorio_table_votes").catch(() => {}));
  const context = await visitor(browser);
  const guest = await context.newPage();
  const viewed = guest.waitForResponse(response => response.url().endsWith("/api/analytics") && response.request().postData()?.includes('"event":"page_view"'));
  await guest.goto(`/mostro/${UNVERIFIED}`);
  expect((await viewed).status()).toBe(200);
  const box = guest.locator("[data-table-test]");
  await expect(box.getByRole("heading", { name: "L’hai provato al tavolo?" })).toHaveCSS("font-size", "22px");
  await expect(box).toContainText("Com’è andata rispetto al suo Grado di sfida?");
  await expect(box.locator("[data-table-waiting]")).toHaveText("Un voto per dispositivo, puoi cambiarlo. Il conteggio compare dopo 5 prove.");
  const vote = async (name, value) => {
    const saved = guest.waitForResponse(response => response.url().endsWith("/api/analytics") && response.request().postData()?.includes('"event":"prova_tavolo"'));
    await box.getByRole("button", { name }).click();
    expect((await saved).status()).toBe(200);
    await expect(box.locator(`[data-table-vote="${value}"]`)).toHaveAttribute("aria-pressed", "true");
  };
  await vote("Giusto", "giusto");
  await expect(box.locator('[data-table-vote="giusto"]')).toHaveCSS("border-top-color", "rgb(31, 107, 69)");
  await expect(box.locator('[data-table-vote="giusto"]')).toHaveCSS("min-height", "52px");
  await vote("Troppo difficile", "difficile");
  await expect(box.locator('[data-table-vote="difficile"]')).toHaveCSS("border-top-color", "rgb(122, 31, 43)");
  await expect(box.locator('[data-table-vote="giusto"]')).toHaveAttribute("aria-pressed", "false");
  // One vote per device: changed, never two.
  const rows = await database(client => client.query("SELECT voto FROM grimorio_table_votes WHERE scheda_id = $1", [UNVERIFIED]));
  expect(rows.rows.map(row => row.voto)).toEqual(["difficile"]);
  await guest.reload();
  await expect(box.locator('[data-table-vote="difficile"]')).toHaveAttribute("aria-pressed", "true");
  if (SHOTS) await box.screenshot({ path: `${SHOTS}/tavolo-prima-390.png` });
  // Four other masters: from 5 votes the count appears.
  await database(async client => { for (let i = 0; i < 4; i++) await client.query("INSERT INTO grimorio_table_votes (scheda_id, chiave, voto) VALUES ($1, $2, 'giusto')", [UNVERIFIED, `altro-${i}`]); });
  await guest.reload();
  await expect(box).toContainText("Provato da 5 master");
  await expect(box).toContainText("facile 0 · giusto 4 · difficile 1");
  await expect(box.getByRole("img")).toHaveAttribute("aria-label", "Troppo facile 0, giusto 4, troppo difficile 1.");
  if (SHOTS) await box.screenshot({ path: `${SHOTS}/tavolo-5-voti-390.png` });
  await context.close();
  // The administrator (on the host where the statistics are on): «Prove al tavolo» in Statistiche, «Al tavolo» beside the
  // verdict; its own vote is never counted.
  const adminContext = await visitor(browser);
  const page = await adminContext.newPage();
  await login(page);
  await page.goto(`/mostro/${UNVERIFIED}`);
  await page.locator("[data-table-test]").getByRole("button", { name: "Troppo facile" }).click();
  await page.waitForTimeout(800);
  expect((await database(client => client.query("SELECT count(*)::int AS n FROM grimorio_table_votes WHERE scheda_id = $1", [UNVERIFIED]))).rows[0].n).toBe(5);
  await page.goto("/admin/statistiche");
  await page.locator('[data-rest-item="tavolo"] > summary').click();
  await expect(page.locator(`[data-table-row="${UNVERIFIED}"]`)).toContainText("5 voti: facile 0 · giusto 4 · difficile 1");
  await page.goto("/admin/bilanciamento");
  await expect(page.locator(`[data-balance-table="${UNVERIFIED}"]`)).toHaveText("Al tavolo: facile 0 · giusto 4 · difficile 1");
  await adminContext.close();
});
