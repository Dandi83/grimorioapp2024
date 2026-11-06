import { test, expect } from "./fixtures.mjs";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";
import { setBestiaryPart } from "./originals-parts.mjs";

// PROMPT 69: «⚔ Affrontalo in Total Party Kill» at the bottom of the 2024 creatures. The part «Affrontalo in TPK»
// starts «Nascosta»: nothing for the public, the button with «Nascosta» for the administrator. Shown from
// /admin/sezioni in one test, then put back. Rows in the local test database only, removed at the end.
const PART = "Affrontalo in TPK";
const OURS = "homebrew-squartatore"; // the editorial staff, 2024
const OLD = "homebrew-prova-tpk69-2014"; // the community, 2014: never the button
const ROWS = [OURS, OLD];
const SUMMON = id => `https://www.totalpartykill.app/evoca?mostro=${id}&da=grimorio`;
const draft = (nome, edizione) => ({
  edizione, nome, taglia: "Media", tipo: "Mostruosità", allineamento: "caotico malvagio", ca: 15, ca_nota: "", pf: 52, dadi_vita: "8d8 + 16",
  velocita: "9 m", forza: 16, destrezza: 14, costituzione: 14, intelligenza: 6, saggezza: 12, carisma: 7, ts_competenti: [], abilita: "",
  vulnerabilita: "", resistenze: "", immunita_danni: "", immunita_condizioni: "", sensi: "", linguaggi: "", habitat: [], grado_sfida: "3", tratti: [],
  azioni: [{ nome: "Artiglio", testo: "Tiro per colpire in mischia: +5, portata 1,5 m. Colpito: 10 (2d6 + 3) danni taglienti." }],
  azioni_bonus: [], reazioni: [], azioni_leggendarie: [], descrizione: `Descrizione pubblica di ${nome}.`,
});

async function database(run) {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try { return await run(client); } finally { await client.end(); }
}

async function signIn(browser) {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 } });
  const admin = await context.newPage();
  await admin.goto("/admin");
  await admin.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await admin.getByRole("button", { name: "Entra" }).click();
  await expect(admin.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
  return { context, admin };
}

/** Every request of a page to Total Party Kill: there must be none (the button is only a link). */
function watchTpk(context) {
  const seen = [];
  context.on("request", request => { if (new URL(request.url()).hostname.endsWith("totalpartykill.app")) seen.push(request.url()); });
  return seen;
}

test.describe.configure({ mode: "serial" });

let since;
let inserted = [];
test.beforeAll(async () => {
  await database(async client => {
    since = (await client.query("SELECT now() AS t")).rows[0].t;
    await client.query(`CREATE TABLE IF NOT EXISTS grimorio_homebrew (id text PRIMARY KEY, scheda jsonb NOT NULL,
      edizione text NOT NULL CHECK (edizione IN ('2014', '2024', 'entrambe')), autore text, proposta_id uuid,
      pubblicata_il timestamptz NOT NULL DEFAULT now(), aggiornata_il timestamptz NOT NULL DEFAULT now(), licenza text)`);
    await client.query("ALTER TABLE grimorio_homebrew ADD COLUMN IF NOT EXISTS bilanciamento text");
    await client.query("ALTER TABLE grimorio_homebrew ADD COLUMN IF NOT EXISTS verificato boolean NOT NULL DEFAULT false");
    const insert = `INSERT INTO grimorio_homebrew (id, scheda, edizione, autore, licenza) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING RETURNING id`;
    for (const [id, nome, edizione, autore] of [[OURS, "Squartatore di prova", "2024", null], [OLD, "Lupo di prova 69", "2014", "Lia"]]) {
      const { rows } = await client.query(insert, [id, JSON.stringify(draft(nome, edizione)), edizione, autore, "CC BY-NC-SA 4.0"]);
      inserted.push(...rows.map(row => row.id));
    }
  });
});

test.afterAll(async ({ browser }) => {
  test.setTimeout(120_000);
  await database(client => client.query("DELETE FROM grimorio_homebrew WHERE id = ANY($1)", [inserted]));
  // Back to the starting state («Nascosta»): the save refreshes the cached pages; then its rows go, with the log.
  const { context, admin } = await signIn(browser);
  await setBestiaryPart(admin, PART, "Nascosta");
  await context.close();
  await database(async client => {
    await client.query("DELETE FROM grimorio_section_parts WHERE sezione = 'bestiario' AND parte = 'tpk'");
    await client.query("DELETE FROM grimorio_section_parts_log WHERE creata_il >= $1", [since]).catch(() => undefined);
    await client.query("DELETE FROM grimorio_analytics_events WHERE event_name = 'tpk_summon_click' OR (visitor_id IN (SELECT visitor_id FROM grimorio_analytics_events WHERE received_at >= $1 AND path = '/mostro/drago-nero-adulto'))", [since]).catch(() => undefined);
  });
});

test("hidden from the start: no button and no trace of it for the public, on SRD and original creatures", async ({ page, context }) => {
  const seen = watchTpk(context);
  for (const id of ["drago-nero-adulto", "triceratopo"]) {
    const response = await page.goto(`/mostro/${id}`);
    expect(response.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("[data-tpk-summon]")).toHaveCount(0);
    const html = await response.text();
    for (const text of ["Affrontalo in Total Party Kill", "evoca?mostro", "data-tpk-summon", 'data-part="bestiario:tpk"']) expect(html, `${id}: ${text}`).not.toContain(text);
  }
  expect(seen).toEqual([]);
});

test("the administrator: the button with «Nascosta», exact link, at the bottom of the sheet; never on 2014 sheets", async ({ browser }) => {
  test.setTimeout(120_000);
  const { context, admin } = await signIn(browser);
  const seen = watchTpk(context);
  await admin.goto("/mostro/drago-nero-adulto");
  const block = admin.locator('[data-part="bestiario:tpk"]');
  await expect(block).toBeVisible();
  await expect(block.getByText("Nascosta", { exact: true })).toBeVisible();
  const button = admin.locator('[data-tpk-summon="drago-nero-adulto"]');
  await expect(button).toHaveAttribute("href", SUMMON("drago-nero-adulto"));
  await expect(button).toHaveAttribute("target", "_blank");
  await expect(button).toHaveAttribute("rel", "noopener");
  await expect(button).toContainText("Affrontalo in Total Party Kill");
  await expect(button).toContainText("Scegli il tuo party e combatti · si apre in una nuova scheda");
  // Touch area and place: after the last block of the sheet (the legendary actions), before the source box.
  const box = await button.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
  const lastSection = await admin.locator("[data-monster-section]").last().boundingBox();
  const source = await admin.locator("[data-source-box]").boundingBox();
  expect(box.y).toBeGreaterThan(lastSection.y + lastSection.height - 1);
  expect(box.y + box.height).toBeLessThan(source.y);
  // The «Resistenza leggendaria» title on one line (part B): one bold title, its words together.
  await expect(admin.getByText("Resistenza leggendaria (3/giorno o 4/giorno nella tana).", { exact: true })).toHaveCount(1);

  // An original creature of the editorial staff, 2024.
  await admin.goto(`/mostro/${OURS}`);
  await expect(admin.locator(`[data-tpk-summon="${OURS}"]`)).toHaveAttribute("href", SUMMON(OURS));
  // 2014: the SRD 5.1 sheet and a 2014 creature of the community.
  for (const id of ["drago-nero-adulto-2014", OLD]) {
    await admin.goto(`/mostro/${id}`);
    await expect(admin.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(admin.locator("[data-tpk-summon]"), id).toHaveCount(0);
  }
  expect(seen).toEqual([]);
  await context.close();
});

test("shown from /admin/sezioni: the public gets it; a tap is counted, without any request to TPK", async ({ browser }) => {
  test.setTimeout(180_000);
  const { context: adminContext, admin } = await signIn(browser);
  await setBestiaryPart(admin, PART, "Visibile");

  // A visitor on http://localhost, where e2e/run.mjs turns the statistics on.
  const base = new URL(test.info().project.use.baseURL);
  base.hostname = "localhost";
  const context = await browser.newContext({ baseURL: base.origin, viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => {
    try { localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ }
  });
  const seen = watchTpk(context);
  const page = await context.newPage();
  const viewed = page.waitForResponse(response => response.url().endsWith("/api/analytics") && response.request().postData()?.includes('"event":"page_view"'));
  await page.goto("/mostro/drago-nero-adulto");
  expect((await viewed).status()).toBe(200);
  const button = page.locator('[data-tpk-summon="drago-nero-adulto"]');
  await expect(button).toHaveAttribute("href", SUMMON("drago-nero-adulto"));
  await expect(page.locator('[data-part="bestiario:tpk"]').getByText("Nascosta")).toHaveCount(0);
  // The tap: the link would open TPK in a new tab; here the navigation is stopped, the count is not.
  await page.evaluate(() => document.addEventListener("click", event => { if (event.target.closest("[data-tpk-summon]")) event.preventDefault(); }, true));
  const counted = page.waitForResponse(response => response.url().endsWith("/api/analytics") && response.request().postData()?.includes('"event":"tpk_summon_click"'));
  await button.click();
  const answer = await counted;
  expect(answer.status()).toBe(200);
  expect(JSON.parse(answer.request().postData())).toMatchObject({ event: "tpk_summon_click", path: "/mostro/drago-nero-adulto" });
  expect(seen).toEqual([]);
  await expect.poll(() => database(async client => (await client.query("SELECT count(*)::int AS n FROM grimorio_analytics_events WHERE event_name = 'tpk_summon_click' AND path = '/mostro/drago-nero-adulto'")).rows[0].n)).toBe(1);
  await context.close();

  // In /admin/statistiche, among the functions.
  await admin.goto("/admin/statistiche?periodo=7");
  const functions = admin.locator('[data-function="tpk"]');
  await expect(functions).toContainText("Affrontalo in TPK");
  await expect(functions).toHaveAttribute("data-people", "1");
  await expect(admin.locator('[data-tpk-row="drago-nero-adulto"]')).toContainText("× 1");
  await adminContext.close();
});
