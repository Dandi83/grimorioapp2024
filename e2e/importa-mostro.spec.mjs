import pg from "pg";
import sharp from "sharp";
import { test, expect } from "./fixtures.mjs";
import { TEST_DATABASE_URL } from "./test-db.mjs";
import { GRIMORIO_TITLE, setBestiaryPart } from "./originals-parts.mjs";

// «Importa mostro» and the new sections of the creatures «Dalla redazione» (PROMPT 44), on the test database only:
// a JSON with errors (messages field by field, nothing saved), a correct one with dangerous HTML (cleaned, preview with
// the hidden section marked, saved hidden), the same id again (the summary, «Annulla», «Sovrascrivi»), the eyes of the
// editor, the picture (WebP, three sizes, under 150 KB, alternative text, no layout shift), and what the public gets:
// the visible sections in their order, never the hidden ones (page, /api/catalogo, search index, service worker).

const ID = "homebrew-custode-delle-braci-p44";
const NAME = "Custode delle braci P44";
const SECRET = "Segreto-agganci-P44";
const TACTIC = "Tattica-visibile-P44";
const VALID = {
  id: "custode-delle-braci-p44", nome: NAME, tipo: "Costrutto", taglia: "Grande", allineamento: "neutrale", grado_sfida: "5", gs_num: 5, px: "1.800",
  bonus_competenza: "+3", classe_armatura: "16 (armatura naturale)", iniziativa: "+1 (11)", punti_ferita: "95 (10d10 + 40)", velocita: "9 m",
  forza: 19, destrezza: 12, costituzione: 18, intelligenza: 6, saggezza: 12, carisma: 5, tiri_salvezza: "For +7, Des +1, Cos +7, Int −2, Sag +1, Car −3",
  abilita: "Percezione +4", resistenze: "Fuoco", immunita: "Veleno; Avvelenato", sensi: "Scurovisione 18 m, Percezione passiva 14",
  linguaggi: "capisce il Comune ma non parla", habitat: ["Sottosuolo"],
  descrizione: "Un guardiano di pietra.<script>window.__xss = 1</script><br><br>Veglia sulle <em>tombe</em>.",
  tratti: "<strong>Corpo di brace.</strong> Chi lo tocca subisce 5 (1d10) danni da fuoco.",
  azioni: "<strong>Pugno.</strong> <em>Tiro per colpire in mischia:</em> +7, portata 1,5 m. <em>Colpito:</em> 13 (2d8 + 4) danni contundenti e il bersaglio è <a href=\"javascript:alert(1)\">prono</a>.",
  azioni_bonus: "", reazioni: "", azioni_leggendarie: "",
  storia: "Forgiato dai <strong>nani</strong> per vegliare.", tattiche: `${TACTIC}: rende spaventato chi fugge.`, tana: "Una cripta di cenere.",
  agganci: `${SECRET}: un mercante cerca chi lo distrugga.`, varianti: "", sezioni_nascoste: ["agganci"],
};

async function database(run) {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try { return await run(client); } finally { await client.end(); }
}
const saved = () => database(async client => (await client.query("SELECT scheda FROM grimorio_homebrew WHERE id = $1", [ID]).catch(() => ({ rows: [] }))).rows[0]?.scheda);
const hiddenCard = () => database(async client => (await client.query("SELECT nascosta FROM grimorio_card_visibility WHERE tipo = 'mostro' AND scheda = $1", [ID]).catch(() => ({ rows: [] }))).rows[0]?.nascosta);

async function login(page) {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
}

async function visitor(browser, edition = "2024") {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 } });
  await context.addInitScript(value => { try { localStorage.setItem("grimorio.edizione", value); } catch { /* no storage */ } }, edition);
  return { context, page: await context.newPage() };
}

async function paste(page, value) {
  await page.locator("#import-json").fill(typeof value === "string" ? value : JSON.stringify(value, null, 2));
  await page.getByRole("button", { name: "Controlla", exact: true }).click();
}

test.afterAll(async ({ browser }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const admin = await context.newPage();
  await login(admin);
  await admin.goto("/admin/mostri");
  await admin.getByPlaceholder("Cerca per nome o tipo…").fill("custode delle braci");
  const row = admin.locator("main ul li[data-card-row]").filter({ hasText: NAME });
  if (await row.count()) {
    admin.once("dialog", dialog => dialog.accept());
    await row.dispatchEvent("contextmenu");
    await admin.locator("[data-row-menu]").getByRole("button", { name: "Elimina" }).click();
    await expect(row).toHaveCount(0);
  }
  await setBestiaryPart(admin, GRIMORIO_TITLE, "In arrivo");
  await context.close();
  await database(async client => {
    await client.query("DELETE FROM grimorio_card_visibility WHERE tipo = 'mostro' AND scheda = $1", [ID]).catch(() => undefined);
    await client.query("DELETE FROM grimorio_homebrew WHERE id = $1", [ID]).catch(() => undefined);
  });
});

test("Importa mostro: errors without saving, cleaned HTML, preview with the hidden section, saved hidden, overwrite only after confirmation", async ({ browser }) => {
  test.setTimeout(180_000);
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const dialogs = [];
  page.on("dialog", dialog => { dialogs.push(dialog.message()); void dialog.dismiss(); });
  await login(page);
  await page.goto("/admin/mostri");
  await page.locator("[data-import-link]").click();
  await expect(page).toHaveURL(/\/admin\/mostri\/importa$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Importa mostro");

  // Errors: listed field by field, «Salva» stays off, nothing in the database.
  await paste(page, { ...VALID, nome: "", forza: "tanta", px: "2.300", colore: "rosso" });
  const errors = page.locator("[data-import-issues=error]");
  await expect(errors).toBeVisible();
  await expect(errors).toContainText("Nome: campo obbligatorio mancante.");
  await expect(errors).toContainText("non è un numero valido");
  await expect(errors).toContainText("non è coerente con il GS 5 (deve essere 1.800)");
  await expect(errors).toContainText("Chiave sconosciuta «colore»");
  await expect(page.getByRole("button", { name: "Salva", exact: true })).toBeDisabled();
  await expect(page.locator("[data-import-preview]")).toHaveCount(0);
  expect(await saved()).toBeUndefined();
  await paste(page, "{ \"nome\": ");
  await expect(errors).toContainText("non è un JSON valido");

  // Correct, with dangerous HTML: notices, the preview as on the site, the hidden section marked.
  await paste(page, VALID);
  await expect(errors).toHaveCount(0);
  const notices = page.locator("[data-import-issues=warn]");
  await expect(notices).toContainText("HTML non ammesso rimosso (<script>)");
  await expect(notices).toContainText("HTML non ammesso rimosso (<a>)");
  const preview = page.locator("[data-import-preview]");
  await expect(preview.getByRole("heading", { level: 1 })).toHaveText(NAME);
  await expect(preview.locator("[data-homebrew-pill='grimorio']")).toBeVisible();
  await expect(preview.locator('[data-section="agganci"]')).toContainText("Nascosta al pubblico");
  await expect(preview.locator('[data-section="tattiche"] [data-hidden-section]')).toHaveCount(0);
  // Bold as in the other sections: bordeaux, semibold.
  await expect(preview.locator('[data-section="storia"] span.font-semibold.text-primary')).toHaveText("nani");
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  expect(await preview.innerHTML()).not.toMatch(/<script|javascript:/);
  if (process.env.IMPORT_SHOTS) await page.screenshot({ path: `${process.env.IMPORT_SHOTS}/importa-390.png`, fullPage: true });

  // «Salva»: «Dalla redazione», 2014 and 2024, hidden from the public; links to the editor and the card.
  await page.getByRole("button", { name: "Salva", exact: true }).click();
  const done = page.locator(`[data-import-saved="${ID}"]`);
  await expect(done).toContainText("Salvato, nascosto al pubblico");
  await expect(done.getByRole("link", { name: "Modifica" })).toHaveAttribute("href", `/admin/mostri/${ID}`);
  await expect(done.getByRole("link", { name: "Vedi scheda" })).toHaveAttribute("href", `/mostro/${ID}`);
  const card = await saved();
  expect(card.edizione).toBe("entrambe");
  expect(card.sezioni_nascoste).toEqual(["agganci"]);
  expect(JSON.stringify(card)).not.toMatch(/<script|javascript:|<a /);
  expect(await hiddenCard()).toBe(true);
  const balance = await database(async client => (await client.query("SELECT bilanciamento, autore FROM grimorio_homebrew WHERE id = $1", [ID])).rows[0]);
  expect(balance.autore).toBeNull();
  expect(["in linea", "da controllare", "fuori", null]).toContain(balance.bilanciamento);
  const guest = await visitor(browser);
  expect((await guest.page.goto(`/mostro/${ID}`)).status()).toBe(404);

  // The same id again: a summary of what changes, «Annulla» keeps the card, «Sovrascrivi» changes it.
  await page.reload();
  await paste(page, { ...VALID, punti_ferita: "105 (11d10 + 44)" });
  await expect(page.locator("[data-import-existing]")).toContainText(`Esiste già «${NAME}»`);
  await page.getByRole("button", { name: "Salva", exact: true }).click();
  const confirm = page.locator("[data-import-confirm]");
  await expect(confirm.locator("[data-import-changes]")).toContainText("Punti ferita");
  await expect(confirm.locator("[data-import-changes]")).toContainText("95");
  await expect(confirm.locator("[data-import-changes]")).toContainText("105");
  await confirm.getByRole("button", { name: "Annulla" }).click();
  await expect(confirm).toHaveCount(0);
  expect((await saved()).pf).toBe(95);
  await page.getByRole("button", { name: "Salva", exact: true }).click();
  await page.locator("[data-import-confirm]").getByRole("button", { name: "Sovrascrivi" }).click();
  await expect(page.locator(`[data-import-saved="${ID}"]`)).toContainText("Sovrascritto");
  expect((await saved()).pf).toBe(105);
  expect(await hiddenCard()).toBe(true);
  expect(dialogs).toEqual([]);

  // The computer: the same page, two columns of the sheet in the preview.
  await page.setViewportSize({ width: 1280, height: 900 });
  await paste(page, VALID);
  await expect(page.locator("[data-import-preview]")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await guest.context.close();
  await context.close();
});

test("the eyes and the picture of the editor; the public gets only the visible sections, in order, nowhere else", async ({ browser }) => {
  test.setTimeout(180_000);
  test.skip(!(await saved()), "needs the card of the test before");
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 } });
  const admin = await context.newPage();
  await login(admin);
  await setBestiaryPart(admin, GRIMORIO_TITLE, "Visibile");

  // The editor: the five sections under the legendary actions, an eye next to every title, the picture.
  await admin.goto(`/admin/mostri/${ID}`);
  await expect(admin.locator('[data-editorial-field="storia"]').first()).toBeVisible();
  await admin.waitForTimeout(1500);
  const where = await admin.evaluate(() => [...document.querySelectorAll('[data-editorial-field="storia"]')].map(node => {
    const path = [];
    for (let el = node; el && el !== document.body; el = el.parentElement) path.push(el.tagName + (el.id ? "#" + el.id : "") + (el.getAttribute("data-dialog") ?? ""));
    return path.slice(-6).join(" < ");
  }));
  if (where.length !== 1) console.log("DUPLICATE EDITOR", JSON.stringify(where, null, 1), admin.url());
  expect(where).toHaveLength(1);
  await expect(admin.locator('[data-editorial-field="storia"] textarea')).toHaveValue("Forgiato dai **nani** per vegliare.");
  for (const section of ["descrizione", "tratti", "azioni", "azioni_leggendarie", "storia", "tattiche", "tana", "agganci", "varianti"]) {
    await expect(admin.locator(`[data-section-eye="${section}"]`)).toBeVisible();
  }
  await expect(admin.locator('[data-hidden-label="agganci"]')).toHaveText("Nascosta al pubblico");
  // «Tana» hidden now, «Agganci» stays hidden.
  await admin.locator('[data-section-eye="tana"]').click();
  await expect(admin.locator('[data-hidden-label="tana"]')).toBeVisible();
  // A picture: a large JPG becomes three WebP sizes; the alternative text is needed.
  const photo = await sharp({ create: { width: 2000, height: 1250, channels: 3, background: "#6B4A2B" } })
    .composite([{ input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="1250"><circle cx="1000" cy="625" r="420" fill="#E0A21A"/></svg>') }]).jpeg({ quality: 90 }).toBuffer();
  await admin.locator("[data-picture-input]").setInputFiles({ name: "custode.jpg", mimeType: "image/jpeg", buffer: photo });
  await expect(admin.locator("[data-picture-preview]")).toBeVisible();
  await expect(admin.locator("[data-picture-sizes]")).toContainText("480×300");
  await admin.getByRole("button", { name: "Salva", exact: true }).click();
  await expect(admin.getByRole("alert").filter({ hasText: "testo alternativo" })).toBeVisible();
  await admin.locator("#admin-hb-immagine-alt").fill("Un gigante di pietra con il cuore di brace");
  await admin.locator("#admin-hb-immagine-crediti").fill("Illustrazione di prova");
  await admin.getByRole("button", { name: "Salva", exact: true }).click();
  await expect.poll(async () => (await saved()).immagine_alt).toBe("Un gigante di pietra con il cuore di brace");
  const card = await saved();
  expect(card.sezioni_nascoste).toEqual(["tana", "agganci"]);
  const v = card.immagine.v;

  // Still hidden with the eye: neither the card nor its picture for the public.
  const guest = await visitor(browser);
  expect((await guest.page.goto(`/mostro/${ID}`)).status()).toBe(404);
  expect((await guest.page.request.get(`/immagini-mostri/${v}-m.webp`)).status()).toBe(404);

  // Shown with the eye of the list.
  await admin.goto("/admin/mostri");
  await admin.getByPlaceholder("Cerca per nome o tipo…").fill("custode delle braci");
  await admin.getByRole("switch", { name: `Visibile sul sito: ${NAME}` }).first().click();
  await expect.poll(hiddenCard).toBe(false);

  for (const edition of ["2024", "2014"]) {
    const reader = await visitor(browser, edition);
    // Before the page is opened: no shift while the picture arrives.
    await reader.page.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__cls += entry.value; }).observe({ type: "layout-shift", buffered: true });
    });
    const response = await reader.page.goto(`/mostro/${ID}`);
    expect(response.status()).toBe(200);
    const html = await response.text();
    // The visible sections, in order, after the actions; the hidden ones nowhere.
    const titles = ["Tratti", "Azioni", "Storia e leggenda", "Tattiche"].map(title => html.indexOf(`>${title}<`));
    expect(titles.every(index => index > 0)).toBe(true);
    expect([...titles].sort((a, b) => a - b)).toEqual(titles);
    expect(html).toContain(TACTIC);
    for (const absent of [SECRET, "Agganci per l’avventura", "Una cripta di cenere", ">Tana<", "Nascosta al pubblico", "<script>window.__xss", "javascript:"]) expect(html).not.toContain(absent);
    // The conditions are pills, as in the other sections.
    await expect(reader.page.locator('[data-section="tattiche"] a').filter({ hasText: "spaventato" })).toHaveCount(1);
    // The picture: under the head, above the description, three sizes, its text, its credits, its reserved space.
    const picture = reader.page.locator("[data-monster-picture] img");
    await expect(picture).toHaveAttribute("alt", "Un gigante di pietra con il cuore di brace");
    await expect(reader.page.locator("[data-picture-credits]")).toHaveText("Illustrazione di prova");
    const srcset = await picture.getAttribute("srcset");
    expect(srcset.split(",").map(item => item.trim().split(" ")[1])).toEqual(["480w", "800w", "1200w"]);
    expect(Number(await picture.getAttribute("width"))).toBeGreaterThan(0);
    await expect.poll(() => picture.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    expect(await reader.page.evaluate(() => window.__cls)).toBe(0);
    const order = await reader.page.evaluate(() => {
      const head = document.querySelector("[data-sheet-name]").getBoundingClientRect().top;
      const image = document.querySelector("[data-monster-picture]").getBoundingClientRect().top;
      const lead = [...document.querySelectorAll("p")].find(p => p.textContent.startsWith("Un guardiano di pietra"))?.getBoundingClientRect().top ?? -1;
      return head < image && image < lead;
    });
    expect(order).toBe(true);
    await reader.context.close();
  }
  for (const size of ["s", "m", "l"]) {
    const file = await guest.page.request.get(`/immagini-mostri/${v}-${size}.webp`);
    expect(file.status()).toBe(200);
    expect(file.headers()["content-type"]).toBe("image/webp");
    expect(file.headers()["cache-control"]).toContain("immutable");
    expect((await file.body()).length).toBeLessThanOrEqual(150 * 1024);
  }

  // Nowhere else: the catalog, the search index and the service worker never carry a section.
  for (const path of ["/api/catalogo/bestiario", "/ricerca-indice.json", "/sw.js"]) {
    const text = await (await guest.page.request.get(path)).text();
    for (const absent of [SECRET, TACTIC, "Forgiato dai", "Una cripta di cenere"]) expect(text, `${path}: ${absent}`).not.toContain(absent);
  }
  expect(await (await guest.page.request.get("/sw.js")).text()).not.toContain("/immagini-mostri");

  // The sheets that are not ours: nothing new in them.
  const official = await (await guest.page.request.get("/mostro/aboleth")).text();
  for (const absent of ["data-section=", "data-monster-picture", "Storia e leggenda", "data-hidden-section"]) expect(official).not.toContain(absent);
  await guest.context.close();
  await context.close();
});
