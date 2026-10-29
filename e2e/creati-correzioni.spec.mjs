import { test, expect } from "@playwright/test";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";

// PROMPT 22, administrator: the preview of the editor with «Creato dal Grimorio» and the pills under a long name never
// broken inside a word; the typographic minus «−» on the sheets of «Creati da voi»; «NO SRD» without them and the
// quick filter «Creati da voi»; two checks 2014/2024 in the «Bilanciamento» of a creature «2014 e 2024», never in the
// public HTML. Phone and computer, 2014 and 2024. Local test database only.
const SHOTS = process.env.CORREZIONI_SHOTS;
const OURS = "homebrew-cinerario-delle-profondita-abissali";
const OURS_NAME = "Cinerario delle profondità abissali";
const THEIRS = "homebrew-prova-correzioni-2014";
const THEIRS_NAME = "Spettro delle correzioni";
const draft = (nome, edizione, extra = {}) => ({
  edizione, nome, taglia: "Grande", tipo: "Non morto", allineamento: "neutrale malvagio", ca: 15, ca_nota: "", pf: 85, dadi_vita: "10d10 + 30",
  velocita: "9 m", forza: 18, destrezza: 6, costituzione: 16, intelligenza: 3, saggezza: 8, carisma: 5, ts_competenti: ["saggezza"],
  abilita: "Furtività -2", vulnerabilita: "", resistenze: "", immunita_danni: "", immunita_condizioni: "", sensi: "", linguaggi: "", habitat: [], grado_sfida: "5",
  tratti: [], azioni: [{ nome: "Multiattacco", testo: "La creatura effettua due attacchi Artiglio." }, { nome: "Artiglio", testo: "Tiro per colpire in mischia: +7, portata 1,5 m. Colpito: 13 (2d8 + 4) danni taglienti." }],
  azioni_bonus: [], reazioni: [], azioni_leggendarie: [], ...extra,
});

async function database(run) {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try { return await run(client); } finally { await client.end(); }
}

async function admin(browser, width, edition) {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: 900 } });
  await context.addInitScript(value => { try { localStorage.setItem("grimorio.edizione", value); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } }, edition);
  const page = await context.newPage();
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
  return { context, page };
}

/** The name of a sheet: pills under it, every word on one line (a word broken in two has two boxes). */
async function title(scope) {
  return scope.evaluate(root => {
    const h1 = root.querySelector("[data-sheet-name]");
    const labels = root.querySelector("[data-sheet-labels]");
    const css = getComputedStyle(h1);
    const node = h1.firstChild;
    const broken = [];
    let at = 0;
    for (const word of node.textContent.split(" ")) {
      const range = document.createRange();
      range.setStart(node, at);
      range.setEnd(node, at + word.length);
      if ([...range.getClientRects()].filter(rect => rect.width > 0).length > 1) broken.push(word);
      at += word.length + 1;
    }
    return { broken, hyphens: css.hyphens, wrap: css.overflowWrap, labelsBelow: !!labels && labels.getBoundingClientRect().top >= h1.getBoundingClientRect().bottom - 1 };
  });
}

test.beforeAll(async () => {
  await database(async client => {
    await client.query(`CREATE TABLE IF NOT EXISTS grimorio_homebrew (id text PRIMARY KEY, scheda jsonb NOT NULL,
      edizione text NOT NULL CHECK (edizione IN ('2014', '2024', 'entrambe')), autore text, proposta_id uuid,
      pubblicata_il timestamptz NOT NULL DEFAULT now(), aggiornata_il timestamptz NOT NULL DEFAULT now(), licenza text)`);
    await client.query("ALTER TABLE grimorio_homebrew ADD COLUMN IF NOT EXISTS bilanciamento text");
    await client.query("ALTER TABLE grimorio_homebrew ADD COLUMN IF NOT EXISTS verificato boolean NOT NULL DEFAULT false");
    const insert = "INSERT INTO grimorio_homebrew (id, scheda, edizione, autore, licenza) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING";
    await client.query(insert, [OURS, JSON.stringify(draft(OURS_NAME, "entrambe")), "entrambe", null, null]);
    await client.query(insert, [THEIRS, JSON.stringify(draft(THEIRS_NAME, "2014")), "2014", "Lia", "CC BY-NC-SA 4.0"]);
  });
});
test.afterAll(async () => {
  await database(client => client.query("DELETE FROM grimorio_homebrew WHERE id = ANY($1)", [[OURS, THEIRS]]));
});

for (const width of [390, 1280]) {
  for (const edition of ["2024", "2014"]) {
    test(`administrator at ${width}, ${edition}: list filters, preview, minus sign, two balance checks`, async ({ browser, request }) => {
      test.setTimeout(180_000);
      const { context, page } = await admin(browser, width, edition);

      // Contenuti → Mostri: «Creati da voi N» beside «NO SRD»; the creatures of «Creati da voi» not in «NO SRD».
      await page.goto("/admin/mostri");
      await page.getByRole("group", { name: "Edizione dell’area riservata" }).getByRole("button", { name: edition }).click();
      await expect(page.getByTestId("admin-edition-band")).toHaveText(edition);
      const mine = edition === "2014" ? [OURS_NAME, THEIRS_NAME] : [OURS_NAME];
      const creati = page.locator("[data-counter='creati']");
      await expect(creati).toContainText("Creati da voi");
      await expect(creati).toContainText(String(mine.length));
      const rows = page.locator("main ul li[data-card-row]");
      await page.locator("[data-counter='nosrd']").click();
      for (const name of mine) await expect(rows.filter({ hasText: name })).toHaveCount(0);
      const nosrd = Number((await page.locator("[data-counter='nosrd']").textContent()).match(/\d+/)[0]);
      await expect(rows).toHaveCount(nosrd);
      await page.locator("[data-counter='nosrd']").click();
      await creati.click();
      await expect(rows).toHaveCount(mine.length);
      for (const name of mine) await expect(rows.filter({ hasText: name })).toHaveCount(1);
      await creati.click();

      // «Nuovo "Creato dal Grimorio"»: the preview with the bordeaux pill, the long name whole, the pills under it.
      await page.getByRole("button", { name: "Nuovo", exact: true }).click();
      await page.getByRole("dialog", { name: "Nuova creatura" }).getByRole("button", { name: "Creati da voi", exact: true }).click();
      let editor = page.getByRole("dialog");
      await editor.locator("#admin-hb-nome").fill("Cineraio dell’abisso profondissimo");
      await editor.getByRole("button", { name: "Anteprima della scheda" }).click();
      let preview = editor.locator("[data-homebrew-preview]");
      await expect(preview.locator("[data-homebrew-pill='grimorio']")).toHaveText("Creato dal Grimorio");
      await expect(preview.locator("[data-homebrew-pill='community']")).toHaveCount(0);
      expect(await title(preview)).toEqual({ broken: [], hyphens: "none", wrap: "normal", labelsBelow: true });
      await editor.getByRole("button", { name: "Chiudi editor" }).click();
      await expect(editor).toHaveCount(0);

      // «Modifica» of ours from its sheet: «Creato dal Grimorio», «−» in the preview too.
      await page.goto(`/mostro/${OURS}`);
      await page.locator("[data-admin-edit]").filter({ visible: true }).first().click();
      editor = page.getByRole("dialog");
      await expect(editor.locator("#admin-hb-nome")).toHaveValue(OURS_NAME);
      await editor.getByRole("button", { name: "Anteprima della scheda" }).click();
      preview = editor.locator("[data-homebrew-preview]");
      await expect(preview.locator("[data-homebrew-pill='grimorio']")).toBeVisible();
      expect(await title(preview)).toEqual({ broken: [], hyphens: "none", wrap: "normal", labelsBelow: true });
      await expect(preview.locator("[data-ability]").nth(1)).toContainText("−2");
      expect(await preview.locator("[data-ability], [data-monster-strip]").allTextContents()).not.toContainEqual(expect.stringMatching(/-\d/));
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/anteprima-editor-${width}-${edition}.png` });
      await editor.getByRole("button", { name: "Chiudi editor" }).click();

      // The public sheet, seen by the administrator: name and pills, «−», the box with two checks.
      await page.goto(`/mostro/${OURS}`);
      expect(await title(page.locator("article").first())).toEqual({ broken: [], hyphens: "none", wrap: "normal", labelsBelow: true });
      await expect(page.locator("[data-ability]").filter({ hasText: "DES" })).toContainText("−2");
      await expect(page.locator("[data-ability]").filter({ hasText: "INT" })).toContainText("−4");
      await expect(page.locator("[data-monster-strip]")).toContainText("−2");
      await expect(page.locator("article")).toContainText("Furtività −2");
      await expect(page.locator("article")).toContainText("Int −4");
      expect(await page.locator("article [data-ability], article [data-monster-strip]").allTextContents()).not.toContainEqual(expect.stringMatching(/-\d/));
      const box = page.locator("[data-balance-box]");
      await expect(box).toHaveCount(1);
      await expect(box.locator("[data-balance-edition='2024']")).toContainText("Edizione 2024 (SRD 5.2.1)");
      await expect(box.locator("[data-balance-edition='2014']")).toContainText("Edizione 2014 (SRD 5.1)");
      for (const check of ["2024", "2014"]) {
        await expect(box.locator(`[data-balance-edition='${check}'] [data-balance-tactic]`)).toHaveCount(3);
        await expect(box.locator(`[data-balance-edition='${check}'] [data-balance-situation]`)).toHaveCount(7);
        await expect(box.locator(`[data-balance-edition='${check}'] [data-balance-note]`)).toContainText(`mostri SRD ${check}`);
      }
      const results = await box.locator("[data-balance-edition] [data-balance-result]").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-balance-result")));
      const overall = await box.locator("[data-balance-overall]").getAttribute("data-balance-overall");
      expect(overall === "in-linea").toBe(results.every(result => result === "in-linea"));
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/bilanciamento-due-${width}-${edition}.png`, fullPage: true });

      // A creature of one edition: one check only.
      if (edition === "2014") {
        await page.goto(`/mostro/${THEIRS}`);
        await expect(page.locator("[data-balance-box]")).toHaveCount(1);
        await expect(page.locator("[data-balance-edition]")).toHaveCount(0);
        await expect(page.locator("[data-balance-box] [data-balance-note]")).toContainText("mostri SRD 2014");
      }

      // Never in the public HTML.
      for (const path of [`/mostro/${OURS}`, `/mostro/${THEIRS}`]) {
        const html = await (await request.get(path)).text();
        expect(html).not.toMatch(/data-balance|Edizione 2014 \(SRD 5\.1\)|Esito complessivo/);
      }
      await context.close();
    });
  }
}

test("the form preview keeps «Creato da voi»; the name whole, the pills under it", async ({ browser }) => {
  for (const width of [390, 1280]) {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: 900 } });
    const page = await context.newPage();
    await page.goto("/bestiario/proponi");
    await page.locator("#hb-nome").fill("Cinerario delle profondità abissali");
    await page.locator("#hb-destrezza").fill("6").catch(() => {});
    await page.locator("[data-proposal-preview]").click();
    const preview = page.locator("[data-homebrew-preview]");
    await expect(preview.locator("[data-homebrew-pill='community']")).toBeVisible();
    await expect(preview.locator("[data-homebrew-pill='grimorio']")).toHaveCount(0);
    expect(await title(preview)).toEqual({ broken: [], hyphens: "none", wrap: "normal", labelsBelow: true });
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/anteprima-modulo-${width}.png` });
    await context.close();
  }
});
