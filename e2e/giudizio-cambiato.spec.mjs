import { test, expect } from "./fixtures.mjs";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";

// PROMPT 29: the stricter rule never takes a pill away by itself. A creature saved «In linea» with the pill on, whose
// verdict of today is no longer «In linea» (the lynx «2014 e 2024» of CR 1: with the characters down as seventh measure
// it is «Da controllare» in 2014), shows «Giudizio cambiato: ricontrolla» beside the box in /admin/bilanciamento; one
// still in line does not; the administrator decides. 390 and 1280. Local test database only.
const CHANGED = "homebrew-prova-giudizio-cambiato";
const STEADY = "homebrew-prova-giudizio-fermo";
const draft = (nome, gs, ca, pf, dadi, attacco) => ({
  edizione: "entrambe", nome, taglia: "Media", tipo: "Bestia", allineamento: "neutrale", ca, ca_nota: "", pf, dadi_vita: dadi,
  velocita: "12 m", forza: 14, destrezza: 15, costituzione: 12, intelligenza: 3, saggezza: 12, carisma: 6, ts_competenti: [],
  abilita: "", vulnerabilita: "", resistenze: "", immunita_danni: "", immunita_condizioni: "", sensi: "", linguaggi: "", habitat: [], grado_sfida: gs,
  tratti: [], azioni: [{ nome: "Morso", testo: attacco }], azioni_bonus: [], reazioni: [], azioni_leggendarie: [],
});

async function database(run) {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try { return await run(client); } finally { await client.end(); }
}

async function signIn(browser, width) {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: 900 } });
  await context.addInitScript(() => { try { window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
  const page = await context.newPage();
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
  return { context, page };
}

const saved = id => database(client => client.query("SELECT bilanciamento, verificato FROM grimorio_homebrew WHERE id = $1", [id])).then(result => result.rows[0]);

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await database(async client => {
    await client.query(`CREATE TABLE IF NOT EXISTS grimorio_homebrew (id text PRIMARY KEY, scheda jsonb NOT NULL,
      edizione text NOT NULL CHECK (edizione IN ('2014', '2024', 'entrambe')), autore text, proposta_id uuid,
      pubblicata_il timestamptz NOT NULL DEFAULT now(), aggiornata_il timestamptz NOT NULL DEFAULT now(), licenza text)`);
    await client.query("ALTER TABLE grimorio_homebrew ADD COLUMN IF NOT EXISTS bilanciamento text");
    await client.query("ALTER TABLE grimorio_homebrew ADD COLUMN IF NOT EXISTS verificato boolean NOT NULL DEFAULT false");
    const insert = "INSERT INTO grimorio_homebrew (id, scheda, edizione, autore, licenza, bilanciamento, verificato) VALUES ($1, $2, $3, NULL, NULL, 'in linea', true) ON CONFLICT (id) DO UPDATE SET bilanciamento = 'in linea', verificato = true";
    await client.query(insert, [CHANGED, JSON.stringify(draft("Lince del giudizio cambiato", "1", 13, 22, "4d8 + 4", "Tiro per colpire in mischia: +4, portata 1,5 m. Colpito: 7 (2d4 + 2) danni perforanti.")), "entrambe"]);
    await client.query(insert, [STEADY, JSON.stringify(draft("Sentinella del giudizio fermo", "3", 14, 60, "8d10 + 16", "Tiro per colpire in mischia: +5, portata 1,5 m. Colpito: 20 (3d10 + 4) danni taglienti.")), "entrambe"]);
  });
});

// The rows from the database, then the bin of the reserved area on one of them: it refreshes the cached lists of the
// site (e2e/homebrew.spec.mjs starts with no creature of «Creati da voi»).
test.afterAll(async ({ browser }) => {
  await database(client => client.query("DELETE FROM grimorio_homebrew WHERE id = $1", [STEADY]));
  const { context, page } = await signIn(browser, 1280);
  await page.goto("/admin/mostri");
  await page.getByRole("group", { name: "Edizione dell’area riservata" }).getByRole("button", { name: "2024" }).click();
  await page.getByPlaceholder("Cerca per nome o tipo…").fill("lince del giudizio");
  page.once("dialog", dialog => dialog.accept());
  await page.locator("main ul li[data-card-row]").filter({ hasText: "Lince del giudizio cambiato" }).dispatchEvent("contextmenu");
  await page.locator("[data-row-menu]").getByRole("button", { name: "Elimina" }).click();
  await expect.poll(async () => (await (await context.request.get("/api/catalogo/bestiario")).json()).monsters.some(monster => monster.homebrew)).toBe(false);
  await context.close();
});

for (const width of [390, 1280]) {
  test(`/admin/bilanciamento at ${width}: «Giudizio cambiato: ricontrolla» beside a pill whose verdict is no longer «In linea»; nothing changes by itself`, async ({ browser }) => {
    test.setTimeout(180_000);
    const { context, page } = await signIn(browser, width);
    await page.goto("/admin/bilanciamento");
    const changed = page.locator(`[data-balance-item="${CHANGED}"]`), steady = page.locator(`[data-balance-item="${STEADY}"]`);

    // The lynx: «Da controllare» in 2014 today, the pill still on, the notice beside the box.
    await expect(changed.locator("[data-balance-editions]")).toHaveText("2014: Da controllare · 2024: In linea");
    await expect(changed.locator("[data-saved-verdict]")).toHaveAttribute("data-saved-verdict", "in linea");
    const box = changed.getByRole("checkbox", { name: /Mostra «Bilanciamento verificato»/ });
    await expect(box).toBeChecked();
    const notice = changed.locator("[data-verdict-changed]");
    await expect(notice).toBeVisible();
    await expect(notice).toHaveAttribute("data-verdict-changed", "da controllare");
    await expect(notice).toContainText("Giudizio cambiato: ricontrolla");
    await expect(notice).toContainText("oggi «Da controllare»");
    // Beside the box: on the same row of the toggle.
    expect(await notice.evaluate(node => node.closest("[data-verified-state]") !== null)).toBe(true);
    // The other one, still in line: no notice.
    await expect(steady.locator("[data-balance-editions]")).toHaveText("2014: In linea · 2024: In linea");
    await expect(steady.getByRole("checkbox", { name: /Mostra «Bilanciamento verificato»/ })).toBeChecked();
    await expect(steady.locator("[data-verdict-changed]")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    // Opening the page wrote nothing: the saved verdict and the pill as they were.
    expect(await saved(CHANGED)).toEqual({ bilanciamento: "in linea", verificato: true });
    if (process.env.TARATURA_SHOTS) await changed.screenshot({ path: `${process.env.TARATURA_SHOTS}/giudizio-cambiato-${width}.png` });

    // The administrator decides: the box off, the notice goes; on again (the saved verdict is still «In linea»), back.
    await box.uncheck();
    await expect(changed.locator("[data-verified-state]")).toHaveAttribute("data-verified-state", "no");
    await expect(notice).toHaveCount(0);
    await expect.poll(async () => (await saved(CHANGED)).verificato).toBe(false);
    await page.reload();
    await expect(changed.locator("[data-verdict-changed]")).toHaveCount(0);
    await changed.getByRole("checkbox", { name: /Mostra «Bilanciamento verificato»/ }).check();
    await expect.poll(async () => (await saved(CHANGED)).verificato).toBe(true);
    await page.reload();
    await expect(changed.locator("[data-verdict-changed]")).toBeVisible();
    await context.close();
  });
}
