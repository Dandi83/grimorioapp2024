import { test, expect } from "./fixtures.mjs";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";

// Trademark note in /termini, /info and /fonti; the «Diritti» category of «Segnala» (contested page and email required,
// on top of the admin list with the page one tap away, «Nascondi la scheda in attesa di verifica»); «Nomi da rivedere»
// (reserved area only). Test database only: the card and the request added here are removed at the end.
const NOTE = "Dungeons & Dragons, D&D e i relativi nomi e logo sono marchi di Wizards of the Coast LLC. Il Grimorio.App li cita solo per indicare la compatibilità con la quinta edizione del gioco. Non è un prodotto ufficiale.";
const SRD51 = "Questo lavoro include materiale del System Reference Document 5.1 (“SRD 5.1”) di Wizards of the Coast LLC disponibile al sito https://dnd.wizards.com/it/resources/systems-reference-document. L’SRD 5.1 è concesso in licenza sotto l’Attribuzione 4.0 Internazionale di Creative Commons disponibile al sito https://creativecommons.org/licenses/by/4.0/legalcode.it.";
const SHOTS = process.env.MARCHI_SHOTS;
const CARD = "fame-di-hadar-e2e";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem("grimorio.edizione", "2024"); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
});

async function login(page) {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
}

test("trademark note on /termini, /info and /fonti, next to the non-affiliation sentence; SRD attribution unchanged", async ({ page }) => {
  for (const address of ["/termini", "/info", "/fonti"]) {
    await page.goto(address);
    await expect(page.locator("[data-trademark-note]"), address).toHaveText(NOTE);
  }
  await expect(page.getByText(SRD51, { exact: true })).toBeVisible();
  await page.goto("/termini");
  await expect(page.getByRole("heading", { name: "Segnalazioni di violazione dei diritti" })).toBeVisible();
  await expect(page.getByText("Il contenuto segnalato viene nascosto in attesa di verifica. Ogni richiesta riceve una risposta all’email indicata.")).toBeVisible();
});

test("Diritti: contested page and email required; on top in the admin list, card hidden pending review; «Nomi da rivedere» finds «Hadar», visitors see nothing", async ({ page, browser }) => {
  test.setTimeout(240_000);
  const db = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await db.connect();
  try {
    // A NO SRD card added in the reserved area, with a name of the list in its text.
    await db.query("INSERT INTO spells (id, nome_italiano, livello, tempo_di_lancio, durata, descrizione, sort_key) VALUES ($1, 'Fame del vuoto (prova)', '3° livello, Evocazione', '1 azione', 'Concentrazione, fino a 1 minuto', 'Apri un varco verso il buio tra le stelle, il regno di Hadar.', 'fame del vuoto prova')", [CARD]);
    await db.query("INSERT INTO grimorio_content_editions (content_kind, content_id, edition) VALUES ('spell', $1, '2024')", [CARD]);

    // A visitor: «Segnala» from the card, «Diritti»: the page of the card is proposed in full, both fields required.
    const visitor = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await visitor.addInitScript(() => { try { localStorage.setItem("grimorio.edizione", "2024"); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
    const guest = await visitor.newPage();
    await guest.goto(`/spell/${CARD}`);
    await expect(guest.getByRole("heading", { level: 1 })).toContainText("Fame del vuoto");
    await guest.getByRole("link", { name: "Segnala", exact: true }).click();
    await guest.getByRole("button", { name: "Diritti d’autore o marchi (richiesta di rimozione)" }).click();
    const contested = guest.getByLabel("Indirizzo della pagina contestata");
    await expect(contested).toHaveValue(new RegExp(`/spell/${CARD}$`));
    await expect(guest.getByLabel("Email per la risposta (obbligatoria)")).toBeVisible();
    await guest.getByLabel("Messaggio").fill("Il nome Hadar è un mio marchio registrato: chiedo la rimozione.");
    await contested.fill("");
    await guest.getByRole("button", { name: "Invia la richiesta" }).click();
    await expect(guest.getByText(/^Indica l’indirizzo della pagina contestata/)).toBeVisible();
    await contested.fill("https://altro-sito.example/spell/x");
    await guest.getByRole("button", { name: "Invia la richiesta" }).click();
    await expect(guest.getByText(/^Indica l’indirizzo della pagina contestata/)).toBeVisible();
    await contested.fill(`https://ilgrimorio.app/spell/${CARD}`);
    await guest.getByRole("button", { name: "Invia la richiesta" }).click();
    await expect(guest.getByText("Per una richiesta di rimozione serve un’email: ti rispondiamo lì.")).toBeVisible();
    // The server checks the same: no email, no page.
    const { token } = await (await guest.request.get("/api/segnalazioni")).json();
    await guest.waitForTimeout(3300);
    const origin = new URL(guest.url()).origin;
    const direct = await guest.request.post("/api/segnalazioni", { data: { tipo: "diritti", messaggio: "Richiesta senza email inviata da uno script.", percorso: `/spell/${CARD}`, token }, headers: { origin } });
    expect(direct.status()).toBe(400);
    expect((await direct.json()).error).toBe("Per una richiesta di rimozione serve un’email: ti rispondiamo lì.");
    if (SHOTS) await guest.screenshot({ path: `${SHOTS}/segnala-diritti-390.png`, fullPage: true });
    await guest.getByLabel("Email per la risposta (obbligatoria)").fill("titolare@esempio.it");
    await guest.getByRole("button", { name: "Invia la richiesta" }).click();
    await expect(guest.getByRole("heading", { name: "Grazie!" })).toBeVisible({ timeout: 15000 });
    await expect(guest.getByText("Ho ricevuto la tua richiesta di rimozione. Ti risponderò all’email che hai indicato.")).toBeVisible();

    // Nothing of the reserved area for the visitor: the list of names asks for the passcode, no name of the file anywhere public.
    await guest.goto("/admin/nomi-da-rivedere");
    await expect(guest.getByLabel("Passcode")).toBeVisible();
    await expect(guest.getByText("Nomi da rivedere")).toHaveCount(0);
    const html = await (await guest.request.get("/admin/nomi-da-rivedere")).text();
    const catalog = await (await guest.request.get("/api/catalogo/incantesimi?edizione=2024")).text();
    const sw = await (await guest.request.get("/sw.js")).text();
    for (const [where, text] of [["admin page", html], ["catalog", catalog], ["service worker", sw]]) expect(text, where).not.toMatch(/data-review-name|Nome trovato|Nomi propri e marchi da rivedere|Zephyra|Githzerai|Elminster/);
    await visitor.close();
    // The browser code of the build: not the data file (server only). Names of SRD 5.1 spells (Drawmij, Aganazzar) are public: only names found nowhere else are markers.
    const chunks = path.resolve(".next/static");
    const files = fs.readdirSync(chunks, { recursive: true }).filter(file => String(file).endsWith(".js"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) expect(fs.readFileSync(path.join(chunks, String(file)), "utf8"), String(file)).not.toMatch(/Nomi propri e marchi da rivedere|Zephyra|Githzerai|Elminster|Drizzt/);

    // The administrator: the request on top, marked, with the contested page one tap away.
    await login(page);
    await page.goto("/admin/segnalazioni");
    const first = page.locator("main ul li").first();
    await expect(first).toHaveAttribute("data-rights-request", "");
    await expect(first).toContainText("Diritti");
    await expect(first.locator("[data-contested-link]")).toHaveAttribute("href", `/spell/${CARD}`);
    await page.getByRole("link", { name: "Diritti", exact: true }).click();
    await expect(page.locator("main ul li")).toHaveCount(1);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/admin-segnalazioni-diritti-390.png`, fullPage: true });
    await first.getByRole("link").first().click();
    await expect(page.getByRole("heading", { name: "Richiesta di rimozione per diritti" })).toBeVisible();
    await expect(page.locator("[data-rights-detail] [data-contested-link]")).toHaveAttribute("href", `/spell/${CARD}`);
    await expect(page.getByRole("link", { name: "Rispondi via email" })).toHaveAttribute("href", /^mailto:titolare@esempio\.it\?subject=/);
    await page.getByRole("button", { name: "Nascondi la scheda in attesa di verifica" }).click();
    await expect(page.getByText("La scheda è nascosta dal sito, in attesa di verifica.")).toBeVisible();
    expect((await db.query("SELECT nascosta FROM grimorio_card_visibility WHERE tipo = 'incantesimo' AND scheda = $1", [CARD])).rows[0]?.nascosta).toBe(true);

    // «Nomi da rivedere»: the card with «Hadar», hidden now, links to the card and the editor.
    await page.goto("/admin");
    await page.locator('a[data-due="nomi-da-rivedere"]').click();
    await expect(page.getByRole("heading", { level: 1, name: "Nomi da rivedere" })).toBeVisible();
    const listed = page.locator("[data-review-name]");
    console.log(`[nomi-da-rivedere] test database: ${await listed.count()} cards (the test card included)`);
    const row = page.locator(`[data-review-name="incantesimo:${CARD}"]`);
    await expect(row).toContainText("Fame del vuoto (prova)");
    await expect(row).toContainText("Incantesimo · 2024 · nascosta");
    await expect(row.locator("[data-review-found]")).toHaveText("Hadar");
    await expect(row.getByRole("link", { name: "Apri la scheda" })).toHaveAttribute("href", `/spell/${CARD}`);
    await expect(row.getByRole("link", { name: "Modifica" })).toHaveAttribute("href", new RegExp(`/admin/incantesimi/${CARD}`.replace(/\//g, "%2F")));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/nomi-da-rivedere-390.png`, fullPage: true });
  } finally {
    await db.query("DELETE FROM grimorio_feedback_reports WHERE email_risposta = 'titolare@esempio.it'").catch(() => undefined);
    // The send limit of this device: the request of this test does not count for the other tests.
    await db.query("DELETE FROM grimorio_feedback_limits WHERE sent_at = (SELECT max(sent_at) FROM grimorio_feedback_limits)").catch(() => undefined);
    // The visibility tables exist only after a first switch: an error on a missing table would break the connection.
    const { rows: [tables] } = await db.query("SELECT to_regclass('grimorio_card_visibility') IS NOT NULL AS ok");
    if (tables.ok) {
      await db.query("DELETE FROM grimorio_card_visibility WHERE scheda = $1", [CARD]);
      await db.query("DELETE FROM grimorio_card_visibility_log WHERE scheda = $1", [CARD]);
    }
    await db.query("DELETE FROM grimorio_content_editions WHERE content_id = $1", [CARD]).catch(() => undefined);
    await db.query("DELETE FROM spells WHERE id = $1", [CARD]).catch(() => undefined);
    await db.end();
  }
});
