import pg from "pg";
import sharp from "sharp";
import { gzipSync } from "node:zlib";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { test, expect } from "./fixtures.mjs";
import { TEST_DATABASE_URL } from "./test-db.mjs";
import { GRIMORIO_TITLE, setBestiaryPart } from "./originals-parts.mjs";

// «Condividi come immagine» (PROMPT 50): the menu of «Condividi» (the link as before, the image), the card drawn by the
// browser for every kind of sheet in both editions and formats (size, theme, weight, time), the SRD excerpt as
// printed with its attribution, a creature of the redazione with its picture and a hidden section, the phone's share
// menu simulated (file and caption with ?da=amico on the Square, the file only on the Story, download without it,
// cancel without errors), the statistics, where the button never is, and the code loaded only at the tap.
// CARD_SHOTS=<dir> saves the cards made, to look at them.
const SHOTS = process.env.CARD_SHOTS;

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

/**
 * A visitor: the edition, the width, the share menu of the phone (files: it shares files; cancel: it is closed;
 * none: no sharing, as on most computers), the statistics simulated and the errors of the console kept.
 */
async function reader(browser, { edition = "2024", width = 390, share = "files" } = {}) {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: width === 390 ? 844 : 900 }, acceptDownloads: true });
  await context.addInitScript(({ edition, share }) => {
    try { localStorage.setItem("grimorio.edizione", edition); } catch { /* no storage */ }
    window.__shared = [];
    if (share === "none") {
      Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
      Object.defineProperty(navigator, "canShare", { configurable: true, value: undefined });
    } else {
      Object.defineProperty(navigator, "canShare", { configurable: true, value: data => !!data && (!data.files || data.files.every(file => file instanceof File)) });
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: async data => {
          window.__shared.push({ title: data.title, url: data.url, text: data.text, files: data.files?.map(file => ({ name: file.name, type: file.type, size: file.size })) });
          if (share === "cancel") throw new DOMException("Annullato", "AbortError");
        },
      });
    }
  }, { edition, share });
  const state = { events: [], errors: [] };
  await context.route("**/api/analytics", async route => {
    const request = route.request();
    if (request.method() === "GET") return route.fulfill({ json: { enabled: true, excluded: false, consent: "accepted" } });
    state.events.push(JSON.parse(request.postData() || "{}"));
    return route.fulfill({ json: { ok: true, stored: true } });
  });
  const page = await context.newPage();
  page.on("console", message => { if (message.type() === "error") state.errors.push(message.text()); });
  page.on("pageerror", error => state.errors.push(String(error)));
  return { context, page, state };
}
const named = (state, name) => state.events.filter(event => event.event === name);
const shareButton = page => page.getByRole("button", { name: /^Condividi / }).filter({ visible: true }).first();

/** The menu, then «Condividi come immagine»: the Story preview ready. */
async function openImage(page) {
  // Pages with both editions show the panel of the reader's edition once loaded: the button of that panel.
  await page.waitForLoadState("networkidle");
  await expect(shareButton(page)).toBeVisible();
  await shareButton(page).click();
  await page.getByRole("group", { name: "Condividi" }).getByRole("button", { name: "Condividi come immagine" }).click();
  const preview = page.locator("[data-share-preview]");
  await expect(preview).toHaveAttribute("data-share-preview", "storia", { timeout: 20_000 });
  return preview;
}

/** The file shown in the preview: what the phone would share. */
async function shown(page, name) {
  const info = await page.locator("[data-share-preview]").evaluate(async (img, keep) => {
    await img.decode();
    let data = "";
    // The CSP of the site does not let a script read blob: addresses: the picture is copied through a canvas to look at it.
    if (keep) {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      data = canvas.toDataURL("image/png").split(",")[1];
    }
    return { format: img.dataset.sharePreview, width: img.naturalWidth, height: img.naturalHeight, type: img.dataset.type, bytes: Number(img.dataset.bytes), ms: Number(img.dataset.ms),
      theme: img.dataset.theme, kind: img.dataset.kind, excerpt: img.dataset.excerpt, attribution: img.dataset.attribution, alt: img.alt, data };
  }, Boolean(SHOTS));
  if (SHOTS && info.data) writeFileSync(`${SHOTS}/${name}-${info.format}.png`, Buffer.from(info.data, "base64"));
  delete info.data;
  return info;
}

/** Spaces made one, as the card makes them (lib/share-card.ts plainText). */
const flat = text => text.replace(/\s+/g, " ").trim();

test.describe.configure({ mode: "serial" });

test("menu: «Invia il link» as before, «Condividi come immagine» loaded at the tap; keyboard, Esc and a tap outside", async ({ browser }) => {
  test.setTimeout(120_000);
  const { context, page, state } = await reader(browser);
  const scripts = new Set();
  page.on("response", response => { if (/\/_next\/static\/.*\.js(\?|$)/.test(response.url())) scripts.add(response.url()); });
  await page.goto("/spell/palla-di-fuoco", { waitUntil: "networkidle" });
  const before = new Set(scripts);
  const marker = async urls => (await Promise.all([...urls].map(async url => ({ url, body: await (await context.request.get(url)).text() })))).filter(file => file.body.includes("Preparo la card"));
  // Nothing of the card in the code of the page.
  expect(await marker(before)).toEqual([]);

  const button = shareButton(page);
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  const menu = page.getByRole("group", { name: "Condividi" });
  await expect(menu.getByRole("button")).toHaveText(["🔗Invia il link", "🖼️Condividi come immagine"]);
  await expect(menu.getByRole("button", { name: "Invia il link" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(menu.getByRole("button", { name: "Condividi come immagine" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(button).toBeFocused();
  // A tap outside closes it.
  await button.click();
  await expect(menu).toBeVisible();
  await page.mouse.click(20, 700);
  await expect(menu).toHaveCount(0);

  // «Invia il link»: the same sharing as before (title, canonical link, events).
  await button.click();
  await menu.getByRole("button", { name: "Invia il link" }).click();
  await expect.poll(() => page.evaluate(() => window.__shared.length)).toBe(1);
  expect(await page.evaluate(() => window.__shared[0])).toEqual({ title: "Palla di fuoco — Il Grimorio.App", url: "https://ilgrimorio.app/spell/palla-di-fuoco?ref=share" });
  await expect.poll(() => state.events.map(event => event.event).filter(name => name.startsWith("share"))).toEqual(["share_click", "share_native"]);
  expect(await marker(scripts)).toEqual([]);

  // «Condividi come immagine»: the code arrives now, in one piece under 25 KB gzip.
  await openImage(page);
  const loaded = await marker([...scripts].filter(url => !before.has(url)));
  expect(loaded).toHaveLength(1);
  const gzip = gzipSync(Buffer.from(loaded[0].body), { level: 9 }).length;
  console.log(`MODULO CARD ${loaded[0].url.split("/").pop()} ${gzip} B gzip`);
  expect(gzip).toBeLessThanOrEqual(25 * 1024);
  const dialog = page.getByRole("dialog", { name: "Condividi come immagine" });
  await expect(dialog.getByRole("button", { name: "Chiudi" })).toBeFocused();
  await expect(dialog.getByText("Su Instagram aggiungi lo sticker Link per far aprire la scheda")).toBeVisible();
  await expect(dialog.getByRole("img")).toHaveAttribute("alt", /^Card di «Palla di fuoco» \(Fireball\)\. Incantesimo · 3° livello\. Lancio: /);
  await expect.poll(() => named(state, "share_image_open").map(event => [event.imageFormat, event.imageKind, event.path])).toEqual([["storia", "incantesimo", "/spell/palla-di-fuoco"]]);

  // Square: the file with the caption and the friend's link; Story: the file only.
  await dialog.getByRole("button", { name: "Quadrato" }).click();
  await expect.poll(() => page.evaluate(() => window.__shared.length)).toBe(2);
  const square = await page.evaluate(() => window.__shared[1]);
  expect(square.text).toBe("Palla di fuoco — Il Grimorio.App\nhttps://ilgrimorio.app/spell/palla-di-fuoco?da=amico");
  expect(square.files).toEqual([{ name: "grimorio-palla-di-fuoco-quadrato.png", type: "image/png", size: expect.any(Number) }]);
  await dialog.getByRole("button", { name: "Storia Instagram" }).click();
  await expect.poll(() => page.evaluate(() => window.__shared.length)).toBe(3);
  const story = await page.evaluate(() => window.__shared[2]);
  expect(story.text).toBeUndefined();
  expect(story.files).toEqual([{ name: "grimorio-palla-di-fuoco-storia.png", type: "image/png", size: expect.any(Number) }]);
  await expect.poll(() => named(state, "share_image_sent").map(event => [event.imageFormat, event.imageKind])).toEqual([["quadrato", "incantesimo"], ["storia", "incantesimo"]]);

  // «Salva immagine»: the format shown is downloaded.
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Salva immagine" }).click();
  expect((await download).suggestedFilename()).toBe("grimorio-palla-di-fuoco-storia.png");
  await expect.poll(() => named(state, "share_image_saved").map(event => event.imageFormat)).toEqual(["storia"]);

  // Esc closes the window, the focus goes back to «Condividi».
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(button).toBeFocused();
  expect(state.errors).toEqual([]);
  await context.close();
});

test("without the phone's share menu the card is downloaded; the menu closed is not an error", async ({ browser }) => {
  test.setTimeout(90_000);
  for (const width of [390, 1280]) {
    const { context, page, state } = await reader(browser, { share: "none", width });
    await page.goto("/oggetti-magici/ali-del-volo");
    await openImage(page);
    const download = page.waitForEvent("download");
    await page.getByRole("dialog").getByRole("button", { name: "Quadrato" }).click();
    expect((await download).suggestedFilename()).toBe("grimorio-ali-del-volo-quadrato.png");
    await expect(page.getByRole("dialog").getByRole("status")).toHaveText("Immagine salvata.");
    await expect.poll(() => named(state, "share_image_saved").map(event => [event.imageFormat, event.imageKind])).toEqual([["quadrato", "oggetto-magico"]]);
    // The window inside the screen, no horizontal scroll.
    const box = await page.getByRole("dialog").boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(state.errors).toEqual([]);
    await context.close();
  }
  const { context, page, state } = await reader(browser, { share: "cancel" });
  await page.goto("/spell/dardo-incantato");
  await openImage(page);
  await page.getByRole("dialog").getByRole("button", { name: "Storia Instagram" }).click();
  await expect.poll(() => page.evaluate(() => window.__shared.length)).toBe(1);
  await expect(page.getByRole("dialog").getByRole("status")).toHaveText("");
  expect(named(state, "share_image_sent")).toEqual([]);
  expect(named(state, "share_image_saved")).toEqual([]);
  expect(state.errors).toEqual([]);
  await context.close();
});

// [address, edition, kind, theme, attribution expected]
const SRD_2024 = "Testo SRD 5.2.1 · CC BY 4.0 · Wizards of the Coast";
const SRD_2014 = "Testo SRD 5.1 · CC BY 4.0 · Wizards of the Coast";
const SHEETS = [
  ["/spell/palla-di-fuoco", "2024", "incantesimo", "scuro", SRD_2024],
  ["/spell/palla-di-fuoco-2014", "2014", "incantesimo", "scuro", SRD_2014],
  ["/spell/scossa-sinaptica", "2024", "incantesimo", "scuro", ""],
  ["/mostro/aboleth", "2024", "mostro", "scuro", SRD_2024],
  ["/mostro/accolito-2014", "2014", "mostro", "scuro", SRD_2014],
  ["/oggetti-magici/ali-del-volo", "2024", "oggetto-magico", "pergamena", SRD_2024],
  ["/oggetti-magici/ali-del-volo", "2014", "oggetto-magico", "pergamena", SRD_2014],
  ["/manuale/condizioni-accecato", "2024", "condizione", "scuro", SRD_2024],
  ["/manuale/condizioni-accecato-2014", "2014", "condizione", "scuro", SRD_2014],
  ["/manuale/condizioni-prono-2014", "2014", "condizione", "scuro", "Da SRD 5.1, traduzione nostra · CC BY 4.0 · Wizards of the Coast"],
  ["/equipaggiamento/armi/spada-lunga", "2024", "arma", "pergamena", SRD_2024],
  ["/equipaggiamento/armi/spada-lunga", "2014", "arma", "pergamena", SRD_2014],
  ["/equipaggiamento/armature/cuoio", "2024", "armatura", "pergamena", SRD_2024],
  ["/equipaggiamento/armature/cuoio", "2014", "armatura", "pergamena", SRD_2014],
  ["/equipaggiamento/avventura/acido", "2024", "avventura", "pergamena", SRD_2024],
  ["/equipaggiamento/avventura/acido", "2014", "avventura", "pergamena", SRD_2014],
  ["/equipaggiamento/strumenti/arnesi-da-scasso", "2024", "strumento", "pergamena", SRD_2024],
  ["/equipaggiamento/strumenti/arnesi-da-scasso", "2014", "strumento", "pergamena", SRD_2014],
  ["/equipaggiamento/padronanze/colpo-di-striscio", "2024", "padronanza", "scuro", SRD_2024],
  ["/equipaggiamento/proprieta/accurata", "2024", "proprieta", "pergamena", SRD_2024],
  ["/equipaggiamento/proprieta/accurata", "2014", "proprieta", "pergamena", SRD_2014],
  ["/regole/concentrazione", "2024", "regola", "scuro", SRD_2024],
];

test("one card for every kind of sheet, 2014 and 2024, Story and Square: size, theme, weight, time, SRD excerpt and attribution", async ({ browser }) => {
  test.setTimeout(600_000);
  const times = [];
  for (const [address, edition, kind, theme, attribution] of SHEETS) {
    const label = `${address} ${edition}`;
    const { context, page, state } = await reader(browser, { edition, width: address.includes("armi") ? 1280 : 390 });
    expect((await page.goto(address)).status(), label).toBe(200);
    await openImage(page);
    const story = await shown(page, `${kind}-${edition}`);
    expect({ width: story.width, height: story.height, theme: story.theme, kind: story.kind, attribution: story.attribution, type: story.type }, label)
      .toEqual({ width: 1080, height: 1920, theme, kind, attribution, type: "image/png" });
    expect(story.bytes, label).toBeLessThan(1024 * 1024);
    // The excerpt: the beginning of the text of the sheet, the same characters, cut with «…» or whole.
    if (story.excerpt) {
      const text = flat(await page.locator("main").innerText());
      const start = flat(story.excerpt.replace(/…$/, ""));
      expect(text.includes(start), `${label}: «${start.slice(0, 80)}»`).toBe(true);
      expect(story.excerpt.length, label).toBeLessThanOrEqual(361);
    }
    // The Square: made with the Story when the window opened.
    await page.getByRole("dialog").getByRole("button", { name: "Quadrato" }).click();
    await expect(page.locator("[data-share-preview]")).toHaveAttribute("data-share-preview", "quadrato");
    const square = await shown(page, `${kind}-${edition}`);
    expect({ width: square.width, height: square.height }, label).toEqual({ width: 1080, height: 1080 });
    expect(square.bytes, label).toBeLessThan(1024 * 1024);
    times.push(story.ms, square.ms);
    expect(state.errors, label).toEqual([]);
    await context.close();
  }
  console.log(`TEMPI CARD ms: mediana ${times.sort((a, b) => a - b)[times.length >> 1]}, massimo ${times.at(-1)}`);
});

test("generation under 1.5 seconds with the CPU slowed down 4 times", async ({ browser }) => {
  test.setTimeout(120_000);
  const { context, page } = await reader(browser);
  await page.goto("/spell/palla-di-fuoco");
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await openImage(page);
  const story = await shown(page, "lento");
  await expect(page.locator("[data-share-preview]")).toHaveAttribute("data-share-preview", "storia");
  await page.getByRole("dialog").getByRole("button", { name: "Quadrato" }).click();
  const square = await shown(page, "lento");
  console.log(`TEMPI CPU 4x: storia ${story.ms} ms, quadrato ${square.ms} ms`);
  expect(story.ms).toBeLessThan(1500);
  expect(square.ms).toBeLessThan(1500);
  await context.close();
});

const ID = "homebrew-squartatore-card-p50";
const NAME = "Squartatore di prova P50";
const SECRET = "Segreto-descrizione-P50";
const idOf = hidden => (hidden ? `${ID}-nascosta` : ID);

test("a creature of the redazione with its picture: the image theme in JPEG, never a hidden section", async ({ browser }) => {
  test.setTimeout(180_000);
  const picture = await sharp({ create: { width: 1200, height: 750, channels: 3, background: "#4A2B1B" } })
    .composite([{ input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750"><circle cx="600" cy="300" r="240" fill="#E0A21A"/></svg>') }]).webp({ quality: 80 }).toBuffer();
  const v = randomBytes(8).toString("hex");
  const draft = hidden => ({
    edizione: "2024", nome: NAME, taglia: "Grande", tipo: "Mostruosità", allineamento: "neutrale", ca: 15, ca_nota: "armatura naturale", pf: 75, dadi_vita: "10d10 + 20",
    velocita: "12 m", forza: 18, destrezza: 14, costituzione: 15, intelligenza: 5, saggezza: 12, carisma: 6, ts_competenti: [], abilita: "", vulnerabilita: "",
    resistenze: "", immunita_danni: "", immunita_condizioni: "", sensi: "", linguaggi: "—", habitat: [], grado_sfida: "5",
    tratti: [], azioni: [{ nome: "Artiglio", testo: "Tiro per colpire in mischia: +7, portata 1,5 m. Colpito: 13 (2d8 + 4) danni taglienti." }],
    azioni_bonus: [], reazioni: [], azioni_leggendarie: [], descrizione: `${SECRET}: una belva che squarcia le porte delle fortezze.`,
    immagine: { v, w: 1200, h: 750 }, immagine_alt: "Una belva tra le rovine", sezioni_nascoste: hidden ? ["descrizione"] : [],
  });
  await database(async client => {
    await client.query(`CREATE TABLE IF NOT EXISTS grimorio_monster_images (versione text NOT NULL, misura text NOT NULL CHECK (misura IN ('s', 'm', 'l')),
      larghezza integer NOT NULL, altezza integer NOT NULL, byte integer NOT NULL, webp bytea NOT NULL, creata_il timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (versione, misura))`);
    await client.query(`CREATE TABLE IF NOT EXISTS grimorio_homebrew (id text PRIMARY KEY, scheda jsonb NOT NULL,
      edizione text NOT NULL CHECK (edizione IN ('2014', '2024', 'entrambe')), autore text, proposta_id uuid,
      pubblicata_il timestamptz NOT NULL DEFAULT now(), aggiornata_il timestamptz NOT NULL DEFAULT now(), licenza text)`);
    for (const size of ["s", "m", "l"]) await client.query("INSERT INTO grimorio_monster_images (versione, misura, larghezza, altezza, byte, webp) VALUES ($1, $2, 1200, 750, $3, $4) ON CONFLICT DO NOTHING", [v, size, picture.length, picture]);
    for (const hidden of [false, true]) await client.query("INSERT INTO grimorio_homebrew (id, scheda, edizione, autore, licenza) VALUES ($1, $2, '2024', NULL, NULL) ON CONFLICT (id) DO UPDATE SET scheda = EXCLUDED.scheda", [idOf(hidden), JSON.stringify(draft(hidden))]);
  });
  const adminContext = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const admin = await adminContext.newPage();
  await login(admin);
  await setBestiaryPart(admin, GRIMORIO_TITLE, "Visibile");
  try {
    for (const hidden of [false, true]) {
      const { context, page, state } = await reader(browser);
      await expect.poll(async () => (await page.goto(`/mostro/${idOf(hidden)}`)).status()).toBe(200);
      // The hidden description is not in the page either.
      expect((await page.locator("main").innerText()).includes(SECRET)).toBe(!hidden);
      await openImage(page);
      const story = await shown(page, `redazione-${hidden ? "nascosta" : "visibile"}`);
      expect({ width: story.width, height: story.height, theme: story.theme, type: story.type, attribution: story.attribution }).toEqual({ width: 1080, height: 1920, theme: "immagine", type: "image/jpeg", attribution: "" });
      expect(story.bytes).toBeLessThan(1024 * 1024);
      expect(story.alt).toContain("Mostro del Grimorio · GS 5");
      if (hidden) {
        expect(story.excerpt).toBe("");
        expect(story.alt).not.toContain(SECRET);
      } else expect(story.excerpt).toBe(`${SECRET}: una belva che squarcia le porte delle fortezze.`);
      await page.getByRole("dialog").getByRole("button", { name: "Quadrato" }).click();
      const square = await shown(page, `redazione-${hidden ? "nascosta" : "visibile"}`);
      expect({ width: square.width, height: square.height, type: square.type }).toEqual({ width: 1080, height: 1080, type: "image/jpeg" });
      expect(state.errors).toEqual([]);
      await context.close();
    }
  } finally {
    await database(async client => {
      await client.query("DELETE FROM grimorio_homebrew WHERE id = ANY($1)", [[idOf(false), idOf(true)]]);
      await client.query("DELETE FROM grimorio_monster_images WHERE versione = $1", [v]);
    });
    await setBestiaryPart(admin, GRIMORIO_TITLE, "In arrivo");
    await adminContext.close();
  }
});

test("never on lists, hidden sheets and the reserved area; the feats only when their section is visible", async ({ browser }) => {
  test.setTimeout(180_000);
  const { context, page } = await reader(browser);
  for (const address of ["/grimorio", "/bestiario", "/oggetti-magici", "/compendio/condizioni", "/equipaggiamento/armi", "/talenti", "/preferiti", "/"]) {
    await page.goto(address);
    await expect(page.locator("[data-share-menu], button[aria-expanded][aria-label^='Condividi ']"), address).toHaveCount(0);
  }
  await context.close();
  const adminContext = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 } });
  const admin = await adminContext.newPage();
  await login(admin);
  // The reserved area: no «Condividi».
  for (const address of ["/admin", "/admin/mostri", "/admin/sezioni"]) {
    await admin.goto(address);
    await expect(admin.getByRole("button", { name: /^Condividi / }), address).toHaveCount(0);
  }
  // Talenti «In arrivo»: the administrator sees the sheet, without the button.
  await admin.goto("/talenti/allerta");
  await expect(admin.getByRole("heading", { level: 1 })).toContainText("Allerta");
  await expect(admin.getByRole("button", { name: /^Condividi / })).toHaveCount(0);
  // Visible: the card of a feat, then back to «In arrivo».
  const radio = label => admin.getByRole("radiogroup", { name: "Stato di Talenti", exact: true }).getByRole("radio", { name: label, exact: true });
  await admin.goto("/admin/sezioni");
  await radio("Visibile").click();
  await expect(admin.getByRole("status").filter({ hasText: "Talenti ora è visibile" })).toBeVisible();
  try {
    const { context: guest, page: visitor, state } = await reader(browser);
    await expect.poll(async () => (await visitor.goto("/talenti/allerta")).status()).toBe(200);
    await openImage(visitor);
    const story = await shown(visitor, "talento-2024");
    expect({ width: story.width, height: story.height, theme: story.theme, kind: story.kind, attribution: story.attribution }).toEqual({ width: 1080, height: 1920, theme: "scuro", kind: "talento", attribution: SRD_2024 });
    expect(story.alt).toContain("Card di «Allerta» (Alert). Talento Origini · 2024");
    expect(flat(await visitor.locator("main").innerText()).includes(flat(story.excerpt.replace(/…$/, "")))).toBe(true);
    expect(state.errors).toEqual([]);
    await guest.close();
  } finally {
    await admin.goto("/admin/sezioni");
    await radio("In arrivo").click();
    await expect(admin.getByRole("status").filter({ hasText: "Talenti ora è in arrivo" })).toBeVisible();
    await adminContext.close();
  }
});

test("«Passaparola» in Approfondimenti: cards made, shared and saved by format and by kind, 24 hours and 7 days", async ({ browser }) => {
  test.setTimeout(120_000);
  const PREFIX = "prova-card-p50-";
  await database(async client => {
    await client.query("DELETE FROM grimorio_analytics_events WHERE event_name LIKE 'share_image_%'");
    const insert = (event, format, kind, at) => client.query(
      `INSERT INTO grimorio_analytics_events (id, visitor_id, session_id, view_id, event_name, path, source, is_test, device, share_from, card_kind, exported, received_at)
       VALUES (gen_random_uuid(), $1, gen_random_uuid(), gen_random_uuid(), $2, '/spell/palla-di-fuoco', 'direct', false, 'iphone', $3, $4, true, ${at})`,
      [`${PREFIX}${Math.random()}`, event, format, kind]);
    const now = "now() - interval '1 hour'", days = "now() - interval '3 days'", old = "now() - interval '20 days'";
    for (const at of [now, now, days]) await insert("share_image_open", "storia", "incantesimo", at);
    await insert("share_image_open", "storia", "oggetto-magico", days);
    await insert("share_image_sent", "quadrato", "incantesimo", now);
    await insert("share_image_sent", "storia", "incantesimo", days);
    await insert("share_image_saved", "storia", "oggetto-magico", days);
    await insert("share_image_sent", "storia", "incantesimo", old);
  });
  try {
    for (const width of [390, 1280]) {
      const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: 900 } });
      const page = await context.newPage();
      await login(page);
      await page.goto("/admin/statistiche");
      const card = page.locator('[data-rest-item="passaparola-immagini"]');
      if ((await card.getAttribute("open")) === null) await card.locator("summary").first().click();
      const cells = async selector => card.locator(selector).evaluate(row => [row.querySelector("[data-day]").textContent, row.querySelector("[data-week]").textContent]);
      expect(await cells('[data-share-format-row="storia"]')).toEqual(["0 / 0", "1 / 1"]);
      expect(await cells('[data-share-format-row="quadrato"]')).toEqual(["1 / 0", "1 / 0"]);
      expect(await cells('[data-share-kind-row="incantesimo"]')).toEqual(["2 / 1 / 0", "3 / 2 / 0"]);
      expect(await cells('[data-share-kind-row="oggetto-magico"]')).toEqual(["0 / 0 / 0", "1 / 0 / 1"]);
      await expect(card.locator('[data-share-kind-row="incantesimo"] th')).toHaveText("Incantesimi");
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await context.close();
    }
  } finally {
    await database(client => client.query("DELETE FROM grimorio_analytics_events WHERE visitor_id LIKE $1", [`${PREFIX}%`]));
  }
});
