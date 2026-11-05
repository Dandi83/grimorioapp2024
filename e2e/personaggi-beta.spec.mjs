import { readFileSync } from "node:fs";
import { test, expect, devices } from "./fixtures.mjs";

// PROMPT 62: «I miei personaggi» (beta), /personaggi. The public gets 404; the administrator receives a character from a
// Total Party Kill link (#pg=, #party=), saves it in the browser, opens its sheet, copies its link and deletes it.
// iPhone 390, Android 412, computer 1280. Nothing is written to the database: the characters stay in localStorage.
const BRENNA = readFileSync(new URL("../tests/scheda-tpk-grimorio.cjs", import.meta.url), "utf8").match(/'(#pg=[^']+)'/)[1];
const strip = device => { const copy = { ...device }; delete copy.defaultBrowserType; return copy; };
const SCREENS = [
  ["iPhone 390", strip({ ...devices["iPhone 13"], viewport: { width: 390, height: 844 } })],
  ["Android 412", strip(devices["Pixel 7"])],
  ["computer 1280", strip({ ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 }, screen: { width: 1280, height: 900 } })],
];

async function login(page) {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
}

/** A party link of two characters (#party0=, not compressed), made in the browser from Brenna's link. */
async function partyLink(page) {
  return page.evaluate(async hash => {
    const data = hash.slice(4).replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(data + "===".slice((data.length + 3) % 4)), ch => ch.charCodeAt(0));
    const json = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text();
    const brenna = JSON.parse(json);
    const party = JSON.stringify([brenna, { ...brenna, n: "Ilse", l: 2, sc: undefined, lv: { 2: { pf: 5 } } }]);
    return `#party0=${btoa(String.fromCharCode(...new TextEncoder().encode(party))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
  }, BRENNA);
}

for (const [name, device] of SCREENS) {
  test(`${name}: public 404; the administrator receives Brenna, saves her, opens the sheet, copies the link, deletes her`, async ({ browser }) => {
    test.setTimeout(150_000);
    const baseURL = test.info().project.use.baseURL;

    // The public: 404 as before, nothing of the page in the answer.
    const visitor = await browser.newContext({ ...device, baseURL });
    const pub = await visitor.newPage();
    const answer = await pub.goto(`/personaggi${BRENNA}`);
    expect(answer.status()).toBe(404);
    const html = await answer.text();
    expect(html).not.toContain("I miei personaggi");
    expect(html).not.toContain("Produrre fiamma");
    await visitor.close();

    const context = await browser.newContext({ ...device, baseURL });
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseURL });
    const analytics = [];
    context.on("request", request => { if (request.url().includes("/api/analytics")) analytics.push(request.postData() ?? ""); });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await login(page);

    // 1. Elenco: empty.
    await page.goto("/personaggi");
    await expect(page.getByRole("heading", { level: 1, name: /I miei personaggi/ })).toBeVisible();
    await expect(page.locator("h1 [data-beta-label]")).toHaveText("BETA");
    await expect(page.getByText("Nascosta", { exact: false }).first()).toBeVisible();
    await expect(page.locator("[data-storage-note]")).toHaveText("Salvati solo su questo telefono. Per non perderli usa «Copia il link» in ogni scheda.");
    await expect(page.locator("[data-characters-empty]")).toBeVisible();
    const create = page.locator("[data-create-character]");
    await expect(create).toHaveText("＋ Crea il tuo personaggio");
    await expect(create).toHaveAttribute("href", "https://total-party-kill.vercel.app/crea?ritorno=grimorio");
    await expect(create).toHaveAttribute("target", "_blank");
    await expect(page.getByText("Si apre la creazione guidata di Total Party Kill")).toBeVisible();

    // 2. Personaggio ricevuto: Brenna, checks in green, the values of TPK.
    await page.goto(`/personaggi${BRENNA}`);
    await expect(page.getByRole("heading", { level: 1, name: /Nuovo personaggio/ })).toBeVisible();
    await expect(page.getByText("Arrivato da Total Party Kill")).toBeVisible();
    const summary = page.locator('[data-incoming-summary="Brenna"]');
    await expect(summary).toContainText("Druido · Circolo della Terra");
    await expect(summary).toContainText("Elfo (dei boschi) · Sapiente");
    await expect(summary).toContainText("3° livello");
    await expect(page.locator('[data-check="ok"]')).toHaveCount(3);
    await expect(page.locator('[data-check="ko"]')).toHaveCount(0);
    await expect(page.locator("[data-checks]")).toContainText("Tutto dall’SRD 5.2.1");
    await expect(page.locator("[data-checks]")).toContainText("12 incantesimi trovati nel Grimorio");
    const tile = label => page.locator(`[data-calc-tile="${label}"] dd`);
    await expect(tile("PF")).toHaveText("24");
    await expect(tile("CA")).toHaveText("14");
    await expect(tile("CD")).toHaveText("13");
    await expect(tile("INIZ.")).toHaveText("+1");
    await expect(tile("M")).toHaveText("10,5");
    await page.getByRole("button", { name: "Salva nei miei personaggi" }).click();
    await expect(page).toHaveURL(/\/personaggi$/);
    const card = page.locator('[data-character-card="Brenna"]');
    await expect(card).toContainText("Druido · Elfo (dei boschi) · 3° livello");
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("grimorio.characters.v1")));
    expect(stored).toHaveLength(1);
    expect(stored[0].sheet.calc).toEqual({ pf: 24, ca: 14, cd: 13, att: 5, ini: 1, vel: 10.5 });
    expect(typeof stored[0].id).toBe("string");
    expect(Date.parse(stored[0].savedAt)).toBeGreaterThan(0);

    // 3. Scheda: values, scores, links.
    await card.click();
    const sheet = page.locator('[data-character-sheet="Brenna"]');
    await expect(sheet.getByRole("heading", { level: 1 })).toHaveText("Brenna");
    await expect(sheet.locator("[data-sheet-line]")).toContainText("3° livello · Druido (Circolo della Terra) · Elfo (dei boschi) · Sapiente");
    await expect(sheet.locator("[data-sheet-line] a")).toHaveAttribute("href", "/classi/druido");
    await expect(sheet.locator("text=calcolati da Total Party Kill")).toBeVisible();
    const scores = await sheet.locator("[data-ability]").evaluateAll(nodes => nodes.map(node => `${node.getAttribute("data-ability")} ${node.querySelector("[data-score]").textContent} ${node.querySelector("[data-modifier]").textContent}`));
    expect(scores).toEqual(["FOR 12 +1", "DES 13 +1", "COS 15 +2", "INT 10 +0", "SAG 17 +3", "CAR 8 −1"]);
    await expect(sheet.locator("[data-feats] a")).toHaveAttribute("href", "/talenti/iniziato-alla-magia");
    const spells = sheet.locator("[data-spells] [data-spell]");
    await expect(spells).toHaveCount(5);
    await expect(sheet.locator("[data-more-spells]")).toHaveText("+7");
    await sheet.locator("[data-more-spells]").click();
    await expect(spells).toHaveCount(12);
    await expect(sheet.locator('[data-spell="produrre-fiamma"]')).toHaveAttribute("href", "/spell/produrre-fiamma");
    const play = sheet.locator("[data-play]");
    await expect(play).toHaveAttribute("href", /^https:\/\/total-party-kill\.vercel\.app\/importa#pg0?=[A-Za-z0-9_-]+$/);
    await expect(play).toHaveAttribute("target", "_blank");
    // A spell link opens the card of the Grimorio.
    await sheet.locator('[data-spell="produrre-fiamma"]').click();
    await expect(page).toHaveURL(/\/spell\/produrre-fiamma$/);
    await expect(page.locator("h1").first()).toContainText(/Produrre fiamma/i);

    // Copia il link: the address of the Grimorio with the character; opening it again offers to replace her.
    await page.goto("/personaggi");
    await page.locator('[data-character-card="Brenna"]').click();
    await page.locator("[data-copy-link]").click();
    await expect(page.locator("[data-copied]")).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText()).catch(() => null);
    const text = copied ?? await page.locator("[data-copied]").textContent();
    const link = /^https:\/\/ilgrimorio\.app\/personaggi(#pg0?=[A-Za-z0-9_-]+)$/.exec(copied ?? "") ?? /^https:\/\/ilgrimorio\.app\/personaggi(#pg0?=[A-Za-z0-9_-]+)$/.exec(text ?? "");
    expect(link, `copied: ${copied ?? text}`).not.toBeNull();
    await page.goto(`/personaggi${link[1]}`);
    await expect(page.locator('[data-incoming-summary="Brenna"]')).toBeVisible();
    await page.getByRole("button", { name: "Salva nei miei personaggi" }).click();
    await expect(page.locator("[data-duplicate]")).toContainText("«Brenna» (Druido)");
    await page.getByRole("button", { name: "Sostituisci" }).click();
    await expect(page.locator('[data-character-card="Brenna"]')).toHaveCount(1);

    // Elimina, with the confirmation.
    await page.locator('[data-character-card="Brenna"]').click();
    await page.locator("[data-delete]").click();
    await expect(page.locator("[data-delete-confirm]")).toContainText("Eliminare «Brenna»");
    await page.locator("[data-delete-confirm]").getByRole("button", { name: "Elimina" }).click();
    await expect(page.locator("[data-characters-empty]")).toBeVisible();

    // A broken link: the error, the page still works.
    await page.goto("/personaggi#pg=AAAA-rotto");
    await expect(page.locator("[data-broken-link] [role=alert]")).toContainText("Il link è danneggiato");
    await page.getByRole("button", { name: "Torna ai miei personaggi" }).click();
    await expect(page.locator("[data-characters-empty]")).toBeVisible();
    await expect(page).toHaveURL(/\/personaggi$/);

    // A party of two: «Nuovo party», both saved; «Annulla» first leaves nothing.
    const party = await partyLink(page);
    await page.goto(`/personaggi${party}`);
    await expect(page.getByRole("heading", { level: 1, name: /Nuovo party/ })).toBeVisible();
    await expect(page.locator("[data-incoming-summary]")).toHaveCount(2);
    await page.getByRole("button", { name: "Annulla" }).click();
    await expect(page.locator("[data-characters-empty]")).toBeVisible();
    await page.goto(`/personaggi${party}`);
    await page.getByRole("button", { name: "Salva nei miei personaggi" }).click();
    await expect(page.locator("[data-character-card]")).toHaveCount(2);
    await expect(page.locator('[data-character-card="Ilse"]')).toContainText("Druido · Elfo (dei boschi) · 2° livello");

    // Never a horizontal scroll; no error; the statistics never carry the «#…» (and /personaggi is not counted).
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    expect(errors).toEqual([]);
    expect(analytics.filter(body => body.includes("#pg") || body.includes("#party") || body.includes("/personaggi"))).toEqual([]);
    await context.close();
  });
}

test("private window: nothing can be saved, the page says so and still shows the character", async ({ browser }) => {
  const context = await browser.newContext({ ...SCREENS[0][1], baseURL: test.info().project.use.baseURL });
  await context.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (String(key).startsWith("grimorio.characters")) throw new DOMException("bloccato", "SecurityError");
      return original.call(this, key, value);
    };
  });
  const page = await context.newPage();
  await login(page);
  await page.goto(`/personaggi${BRENNA}`);
  await expect(page.locator("[data-storage-off]")).toBeVisible();
  await page.getByRole("button", { name: "Salva nei miei personaggi" }).click();
  await expect(page.locator('[data-character-card="Brenna"]')).toBeVisible();
  await expect(page.locator("[data-storage-off]")).toContainText("non permette di salvare");
  await context.close();
});

test("/admin/sezioni: «I miei personaggi» with BETA, «Nascosta» from the start", async ({ page }) => {
  await login(page);
  await page.goto("/admin/sezioni");
  const row = page.locator('[data-section-row="personaggi"]');
  await expect(row).toContainText("I miei personaggi");
  await expect(row.locator("[data-beta-label]")).toHaveText("BETA");
  await expect(row).toContainText("Nascosta");
});
