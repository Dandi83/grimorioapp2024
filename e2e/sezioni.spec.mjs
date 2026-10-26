import { test, expect, devices } from "@playwright/test";
import { readFileSync } from "node:fs";

// «Sezione momentaneamente in costruzione»: one of these under the title (components/sections/section-unavailable.tsx).
const SENTENCES = [
  "I nani della forgia ci stanno ancora lavorando. Tira iniziativa più tardi!",
  "Il mago ha lanciato Costruzione, ma l'incantesimo richiede concentrazione… e qualcuno l'ha disturbato.",
  "Pagina in fase di riposo lungo. Torna tra 8 ore (o forse prima).",
  "Il master sta ancora preparando questa sessione. Prendete pure gli snack.",
  "Un mimic ha preso il posto di questa pagina. La stiamo scacciando.",
  "Hai tirato 1 su Indagare: qui non c'è ancora niente… per ora!",
  "Gli gnomi artefici giurano che sarà pronta presto. Gli gnomi giurano molte cose.",
];
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Tests that hide and show sections and parts (/admin/sezioni). They run last (this file sorts after
// offline.spec.mjs): the test server keeps in memory only which of the pages it rewrote on disk are out
// of date, so a later server could find pages built while something was hidden (on Vercel the cache
// keeps it). Each test ends with everything visible.

// The «Aggiungi alla schermata Home» prompt would cover the bottom bar (see app.spec.mjs).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5));
      // A visitor who has already chosen «la tua edizione» (2024): the first launch has its own test (e2e/edizione.spec.mjs).
      if (!window.localStorage.getItem("grimorio.edizione")) window.localStorage.setItem("grimorio.edizione", "2024");
    } catch { /* no storage */ }
  });
});

test("sections of the app: admin hides and shows every section; public 404 page, Compendio, bar, search and links; dark band with Mostra", async ({ page, browser }) => {
  test.setTimeout(600_000);
  // The public: a second phone without the admin session.
  const publicContext = await browser.newContext({ ...devices["iPhone 13"], baseURL: test.info().project.use.baseURL });
  await publicContext.addInitScript(() => {
    try {
      window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5));
      // A visitor who has already chosen «la tua edizione» (2024): the first launch has its own test (e2e/edizione.spec.mjs).
      if (!window.localStorage.getItem("grimorio.edizione")) window.localStorage.setItem("grimorio.edizione", "2024");
    } catch { /* no storage */ }
  });
  const pub = await publicContext.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  pub.on("pageerror", error => errors.push(error.message));

  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await page.getByRole("link", { name: "Sezioni dell’app" }).click();
  await expect(page).toHaveURL(/\/admin\/sezioni$/);
  await expect(page.getByRole("heading", { level: 1, name: "Sezioni dell’app" })).toBeVisible();
  await expect(page.getByText("Tocca l’occhio per mostrare o nascondere una sezione al pubblico. L’effetto è immediato e non cancella niente.")).toBeVisible();
  await expect(page.getByText("10 visibili")).toBeVisible();
  await expect(page.getByText("0 nascoste")).toBeVisible();
  await expect(page.getByText("Ogni cambio finisce nel Registro modifiche. Le sezioni nascoste restano visibili a te, con l’etichetta «Nascosta».")).toBeVisible();
  const rows = page.getByRole("list", { name: "Sezioni" }).locator(":scope > li");
  await expect(rows).toHaveCount(10);
  await expect(rows.nth(2)).toContainText("Classi");
  await expect(rows.nth(2)).toContainText("Compendio · Personaggi · Visibile");
  for (const width of [360, 375, 390]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `admin ${width}`).toBeLessThanOrEqual(width);
    for (const box of await rows.locator("button[aria-pressed]").evaluateAll(buttons => buttons.map(b => b.getBoundingClientRect().toJSON()))) {
      expect(Math.round(box.width)).toBe(52);
      expect(Math.round(box.height)).toBe(44);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });

  const toggle = async (title, hide) => {
    if (!page.url().endsWith("/admin/sezioni")) await page.goto("/admin/sezioni");
    const button = page.getByRole("button", { name: `${hide ? "Nascondi" : "Mostra"} ${title}`, exact: true });
    await expect(button).toHaveAttribute("aria-pressed", hide ? "true" : "false");
    await button.click();
    await expect(page.getByRole("status")).toHaveText(`${title} ora è ${hide ? "nascosta" : "visibile"}`);
    await expect(page.getByRole("button", { name: `${hide ? "Mostra" : "Nascondi"} ${title}`, exact: true })).toHaveAttribute("aria-pressed", hide ? "false" : "true");
  };
  const unavailable = async path => {
    const response = await pub.goto(path);
    expect(response.status(), path).toBe(404);
    await expect(pub.getByRole("heading", { level: 1 })).toHaveText("Sezione momentaneamente in costruzione");
    await expect(pub.locator("[data-under-construction]")).toHaveText(new RegExp(`^(?:${SENTENCES.map(escape).join("|")})$`));
    await expect(pub.locator("svg.lucide-hammer")).toBeVisible();
    await expect(pub.getByRole("link", { name: "Torna alla Home" })).toHaveAttribute("href", "/");
    expect((await pub.locator('meta[name="robots"]').evaluateAll(metas => metas.map(m => m.content))).join(" "), path).toContain("noindex");
  };
  const band = () => page.getByRole("note").filter({ hasText: "Nascosta · il pubblico non vede questa sezione. La vedi solo tu." });

  // Every section, one at a time: hidden → 404 for the public (list and card), the admin still sees it with the band.
  const SECTIONS = [
    { title: "Incantesimi", list: "/grimorio", card: "/spell/dardo-incantato" },
    { title: "Bestiario", list: "/bestiario", card: "/mostro/aboleth" },
    { title: "Classi", list: "/classi", card: "/classi/mago" },
    { title: "Armi", list: "/equipaggiamento/armi", card: "/equipaggiamento/armi/tridente" },
    { title: "Armature", list: "/equipaggiamento/armature", card: "/equipaggiamento/armature/scudo" },
    { title: "Equipaggiamento d’avventura", list: "/equipaggiamento/avventura", card: "/equipaggiamento/avventura/abaco" },
    { title: "Strumenti", list: "/equipaggiamento/strumenti", card: "/equipaggiamento/strumenti/liuto" },
    { title: "Oggetti magici", list: "/oggetti-magici", card: "/oggetti-magici/ali-del-volo" },
    { title: "Condizioni", list: "/compendio/condizioni", card: "/manuale/condizioni-accecato" },
    { title: "Avanzamento", list: "/avanzamento" },
  ];
  for (const section of SECTIONS) {
    await toggle(section.title, true);
    await expect(page.getByText("9 visibili")).toBeVisible();
    await expect(page.getByText("1 nascosta")).toBeVisible();
    await expect(page.getByRole("list", { name: "Sezioni" }).locator(":scope > li").filter({ hasText: section.title }).first()).toContainText("Nascosta");
    for (const path of [section.list, section.card].filter(Boolean)) {
      await unavailable(path);
      expect((await page.goto(path)).status(), `admin ${path}`).toBe(200);
      await expect(band()).toBeVisible();
      await expect(band().getByRole("button", { name: "Mostra" })).toBeVisible();
    }
    await toggle(section.title, false);
    for (const path of [section.list, section.card].filter(Boolean)) expect((await pub.goto(path)).status(), `public ${path} visible again`).toBe(200);
  }
  await expect(page.getByText("10 visibili")).toBeVisible();

  // Links between sections: Incantesimi hidden → no «Incantesimi del mago →», no spell links in the creatures.
  await pub.goto("/classi/mago");
  await expect(pub.getByRole("link", { name: "Incantesimi del mago →" })).toBeVisible();
  await toggle("Incantesimi", true);
  await pub.goto("/classi/mago");
  await expect(pub.locator("main")).toContainText("Lista degli incantesimi da mago");
  await expect(pub.getByRole("link", { name: "Incantesimi del mago →" })).toHaveCount(0);
  await toggle("Condizioni", true);
  await pub.goto("/mostro/aboleth");
  await expect(pub.locator('main a[href^="/manuale/condizioni-"]')).toHaveCount(0);
  await expect(pub.locator('main a[href^="/spell/"]')).toHaveCount(0);
  await page.goto("/mostro/aboleth");
  await expect(page.locator('main a[href^="/manuale/condizioni-"]').first()).toBeVisible();

  // Classi and the whole Equipaggiamento hidden: empty groups and tiles leave the Compendio, the hub is unavailable.
  for (const title of ["Classi", "Armi", "Armature", "Equipaggiamento d’avventura", "Strumenti", "Bestiario"]) await toggle(title, true);
  await expect(page.getByText("2 visibili")).toBeVisible();
  await expect(page.getByText("8 nascoste")).toBeVisible();
  await pub.goto("/compendio");
  await expect(pub.getByRole("heading", { level: 2, name: "Personaggi" })).toHaveCount(0);
  const publicTiles = pub.getByRole("list", { name: "Regole e oggetti" }).getByRole("link");
  expect(await publicTiles.evaluateAll(links => links.map(a => a.getAttribute("href")))).toEqual(["/avanzamento", "/oggetti-magici"]);
  await unavailable("/equipaggiamento");
  // The 404 page is drawn in the browser: its first render has the first sentence (the same on the server, no
  // hydration mismatch), then one picked at random at every load, without errors in the console.
  const consoleErrors = [];
  const listen = message => { if (message.type() === "error" && !/status of 404/.test(message.text())) consoleErrors.push(message.text()); };
  pub.on("console", listen);
  const seen = new Set();
  for (let load = 0; load < 12 && seen.size < 2; load++) {
    await pub.reload();
    seen.add(await pub.locator("[data-under-construction]").innerText());
  }
  expect(seen.size, [...seen].join(" | ")).toBeGreaterThan(1);
  pub.off("console", listen);
  // No hydration or other error in the console (page errors are checked at the end of the test).
  expect(consoleErrors).toEqual([]);
  // The bottom bar without Incantesimi and Bestiario.
  const nav = pub.getByRole("navigation", { name: "Navigazione principale" });
  expect(await nav.getByRole("link").allTextContents()).toEqual(["Home", "Compendio", "Preferiti"]);
  // Search: no page of a hidden section.
  const index = await (await pub.request.get("/ricerca-indice.json")).json();
  expect(index.sections.map(section => section.k)).toEqual(["oggetti-magici"]);
  expect(index.rows.every(row => row[3].startsWith("/oggetti-magici/"))).toBe(true);
  await pub.goto("/");
  await pub.getByRole("button", { name: /^Cerca nel Grimorio/ }).click();
  await pub.getByRole("dialog").getByRole("searchbox").fill("campione");
  await expect(pub.getByRole("dialog")).toContainText("Nessun risultato");
  // Narrow phones: the 404 page and the admin pages with the band, no horizontal scroll, taps of 44 px.
  for (const width of [360, 375, 390]) {
    await pub.setViewportSize({ width, height: 800 });
    await unavailable("/classi/guerriero");
    expect(await pub.evaluate(() => document.documentElement.scrollWidth), `404 ${width}`).toBeLessThanOrEqual(width);
    expect((await pub.getByRole("link", { name: "Torna alla Home" }).boundingBox()).height).toBeGreaterThanOrEqual(44);
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/classi/guerriero");
    await expect(band()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `band ${width}`).toBeLessThanOrEqual(width);
    expect((await band().getByRole("button", { name: "Mostra" }).boundingBox()).height).toBeGreaterThanOrEqual(44);
  }

  // Admin home: an icon on every row, «Nascosta» under the name of the rows of the hidden sections (no switch there).
  await page.goto("/admin");
  const adminTiles = page.getByRole("region", { name: /^Contenuti 20\d\d$/ }).getByRole("link");
  await expect(adminTiles).toHaveCount(10);
  expect(await adminTiles.evaluateAll(links => links.map(a => a.querySelectorAll('svg[aria-hidden="true"]').length))).toEqual(Array(10).fill(2));
  const labelled = await adminTiles.evaluateAll(links => links.filter(a => /Nascosta/.test(a.textContent)).map(a => a.getAttribute("href")));
  expect(labelled.sort()).toEqual(["/admin/contenuti/armature", "/admin/contenuti/armi", "/admin/contenuti/avventura", "/admin/contenuti/classi", "/admin/contenuti/condizioni", "/admin/contenuti/strumenti", "/admin/incantesimi", "/admin/mostri"]);
  await expect(page.getByRole("region", { name: /^Contenuti 20\d\d$/ }).getByRole("button")).toHaveCount(0);
  const nascosta = adminTiles.first().getByText("Nascosta", { exact: true });
  expect(await nascosta.evaluate(el => { const s = getComputedStyle(el); return [s.backgroundColor, s.color, s.fontSize, s.fontWeight]; })).toEqual(["rgb(43, 33, 24)", "rgb(224, 162, 26)", "11px", "700"]);
  // The pill sits under the name, never over it.
  const [nameBox, pillBox] = [await adminTiles.first().locator("span.font-serif").boundingBox(), await nascosta.boundingBox()];
  expect(pillBox.y).toBeGreaterThanOrEqual(nameBox.y + nameBox.height - 1);
  const tileIcon = adminTiles.first().locator("svg").first();
  expect(await tileIcon.evaluate(svg => [svg.getAttribute("width"), svg.getAttribute("stroke"), svg.getAttribute("stroke-width")])).toEqual(["22", "#7A1F2B", "1.8"]);
  const pills = page.getByRole("region", { name: "Gestione · tutte le edizioni" }).getByRole("link");
  await expect(pills).toHaveCount(4);
  expect(await pills.evaluateAll(links => links.map(a => a.getAttribute("aria-label").split(" · ")[0]))).toEqual(["Sezioni dell’app", "Notifiche", "Registro modifiche", "Statistiche"]);
  await expect(pills.first()).toHaveAttribute("aria-label", /^Sezioni dell’app · \d+ sezion[ei] nascost[ae]/);
  expect(await pills.evaluateAll(links => links.map(a => a.querySelector('svg[aria-hidden="true"]')?.getAttribute("width")))).toEqual(["22", "22", "22", "22"]);
  for (const width of [360, 375, 390]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `admin home ${width}`).toBeLessThanOrEqual(width);
    for (const box of [...await adminTiles.evaluateAll(links => links.map(a => a.getBoundingClientRect().height)), ...await pills.evaluateAll(links => links.map(a => a.getBoundingClientRect().height))]) expect(box).toBeGreaterThanOrEqual(56);
  }

  // The administrator sees everything, labelled «Nascosta»: Compendio tiles and bottom bar.
  await page.goto("/compendio");
  await expect(page.getByRole("list", { name: "Personaggi" }).getByRole("link")).toContainText("Nascosta");
  const adminNav = page.getByRole("navigation", { name: "Navigazione principale" });
  await expect(adminNav.getByRole("link", { name: /Incantesimi/ })).toContainText("Nascosta");
  // «Mostra» in the band: the section is visible again at once.
  await page.goto("/classi");
  await band().getByRole("button", { name: "Mostra" }).click();
  await expect(band()).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: "Classi" })).toBeVisible();
  expect((await pub.goto("/classi")).status()).toBe(200);
  await pub.goto("/compendio");
  await expect(pub.getByRole("heading", { level: 2, name: "Personaggi" })).toBeVisible();

  // The log: every switch, with section and new state.
  await page.goto("/admin/registro?sezione=sezioni&stato=tutte");
  const log = page.getByRole("list", { name: "Modifiche" }).locator(":scope > li");
  await expect(log.first()).toContainText("Classi · visibilità");
  await expect(log.first()).toContainText("Visibile");
  // 10 sections hidden and shown again, 8 hidden together, Classi shown from the band (the Homebrew collection,
  // hidden and shown by e2e/homebrew.spec.mjs on the same database, has its own rows).
  await expect(log.filter({ hasNotText: "Raccolta Homebrew" })).toHaveCount(29);

  // Back to the start: every section visible.
  for (const title of ["Incantesimi", "Condizioni", "Armi", "Armature", "Equipaggiamento d’avventura", "Strumenti", "Bestiario"]) await toggle(title, false);
  await expect(page.getByText("10 visibili")).toBeVisible();
  await pub.goto("/compendio");
  await expect(pub.getByRole("list", { name: "Regole e oggetti" }).getByRole("link")).toHaveCount(4);
  expect(await pub.getByRole("navigation", { name: "Navigazione principale" }).getByRole("link").count()).toBe(5);
  // The test server keeps in memory only which saved pages are out of date (Vercel keeps it in its cache):
  // the pages built while sections were hidden are built again now, so the next server finds them current.
  for (const path of [...SECTIONS.flatMap(section => [section.list, section.card]).filter(Boolean), "/", "/compendio", "/equipaggiamento", "/preferiti", "/classi/guerriero", "/ricerca-indice.json"]) {
    expect((await pub.request.get(path)).status(), path).toBe(200);
  }
  expect((await (await pub.request.get("/ricerca-indice.json")).json()).sections).toHaveLength(6);
  await publicContext.close();
  expect(errors).toEqual([]);
});

test("parts of the sections: every part in its page, editions, collections, class sheet, comparisons, Avanzamento blocks, section first, log, narrow phones", async ({ page, browser }) => {
  test.setTimeout(600_000);
  // The registry of lib/public-sections.ts, read as it is: every part it lists must be in its page.
  const ts = await import("typescript");
  const source = ts.default.transpileModule(readFileSync("lib/public-sections.ts", "utf8"), { compilerOptions: { module: ts.default.ModuleKind.ES2022, target: ts.default.ScriptTarget.ES2022 } }).outputText;
  const registry = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  const publicContext = await browser.newContext({ ...devices["iPhone 13"], baseURL: test.info().project.use.baseURL });
  await publicContext.addInitScript(() => {
    try {
      window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5));
      // A visitor who has already chosen «la tua edizione» (2024): the first launch has its own test (e2e/edizione.spec.mjs).
      if (!window.localStorage.getItem("grimorio.edizione")) window.localStorage.setItem("grimorio.edizione", "2024");
    } catch { /* no storage */ }
  });
  const pub = await publicContext.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  pub.on("pageerror", error => errors.push(error.message));

  for (const section of registry.PUBLIC_SECTIONS) {
    for (const part of section.parts) {
      await pub.goto(part.page);
      if (section.key === "bestiario" && part.group === "raccolte") await pub.getByRole("button", { name: "Filtri" }).click();
      // The editions are the choices of the pill's panel.
      if (part.group === "edizioni") await pub.getByRole("button", { name: /^Edizione 20\d\d: cambia la tua edizione$/ }).filter({ visible: true }).click();
      expect(await pub.locator(`[data-part="${section.key}:${part.key}"]`).count(), `${section.key}:${part.key} in ${part.page}`).toBeGreaterThan(0);
      if ((section.key === "bestiario" && part.group === "raccolte") || part.group === "edizioni") await pub.keyboard.press("Escape");
    }
  }

  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await page.getByRole("link", { name: "Sezioni dell’app" }).click();
  const opener = key => page.locator(`button[aria-controls="parti-${key}"]`);
  await expect(opener("incantesimi")).toHaveText(/^2 parti/);
  await expect(opener("classi")).toHaveText(/^8 parti/);
  await expect(opener("avanzamento")).toHaveText(/^4 parti/);
  await opener("classi").click();
  await expect(page.locator("#parti-classi").getByRole("heading", { level: 3 })).toHaveText(["Edizioni", "Raccolte e schede"]);
  for (const width of [360, 375, 390]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `admin parts ${width}`).toBeLessThanOrEqual(width);
    for (const box of await page.locator("#parti-classi button").evaluateAll(buttons => buttons.map(b => b.getBoundingClientRect().toJSON()))) {
      expect([Math.round(box.width), Math.round(box.height)]).toEqual([52, 44]);
    }
    expect((await opener("classi").boundingBox()).height).toBeGreaterThanOrEqual(44);
  }
  await page.setViewportSize({ width: 390, height: 844 });

  const togglePart = async (key, title, hide) => {
    if (!page.url().endsWith("/admin/sezioni")) await page.goto("/admin/sezioni");
    if ((await opener(key).getAttribute("aria-expanded")) !== "true") await opener(key).click();
    const box = page.locator(`#parti-${key}`);
    const button = box.getByRole("button", { name: `${hide ? "Nascondi" : "Mostra"} ${title}`, exact: true });
    await expect(button).toHaveAttribute("aria-pressed", hide ? "true" : "false");
    await button.click();
    const after = box.getByRole("button", { name: `${hide ? "Mostra" : "Nascondi"} ${title}`, exact: true });
    await expect(after).toHaveAttribute("aria-pressed", hide ? "false" : "true");
    await expect(after).toBeEnabled();
    await expect(page.getByRole("status")).toHaveText(`${title} ora è ${hide ? "nascosta" : "visibile"}`);
  };
  const toggleSection = async (title, hide) => {
    if (!page.url().endsWith("/admin/sezioni")) await page.goto("/admin/sezioni");
    const button = page.getByRole("button", { name: `${hide ? "Nascondi" : "Mostra"} ${title}`, exact: true });
    await button.click();
    await expect(page.getByRole("button", { name: `${hide ? "Mostra" : "Nascondi"} ${title}`, exact: true })).toBeEnabled();
    await expect(page.getByRole("status")).toHaveText(`${title} ora è ${hide ? "nascosta" : "visibile"}`);
  };
  const unavailable = async path => {
    const response = await pub.goto(path);
    expect(response.status(), path).toBe(404);
    await expect(pub.getByRole("heading", { level: 1 })).toHaveText("Sezione momentaneamente in costruzione");
    expect((await pub.locator('meta[name="robots"]').evaluateAll(metas => metas.map(m => m.content))).join(" "), path).toContain("noindex");
  };
  // Lists: the edition pill; the sheets of Equipaggiamento keep their 2024 · 2014 buttons.
  const selector = target => target.getByRole("group", { name: "Edizione delle regole" });
  const pill = target => target.getByRole("button", { name: /^Edizione 20\d\d: cambia la tua edizione$/ }).filter({ visible: true });
  const searchIndex = async () => (await (await pub.request.get("/ricerca-indice.json")).json());

  // Edizione 2014 of the spells hidden: no selector, the remembered 2014 gives way to 2024, 2014 cards 404, no link, no search row.
  await pub.goto("/grimorio");
  await pub.evaluate(() => window.localStorage.setItem("grimorio.edizione", "2014"));
  await togglePart("incantesimi", "Edizione 2014", true);
  await expect(page.getByText("1 parte nascosta")).toBeVisible();
  await pub.goto("/grimorio");
  await expect(pill(pub)).toHaveCount(0);
  await expect(pub.locator('main a[href^="/spell/"]').first()).toBeAttached();
  await expect(pub.locator('main a[href$="-2014"]')).toHaveCount(0);
  await unavailable("/spell/palla-di-fuoco-2014");
  await pub.goto("/spell/palla-di-fuoco");
  await expect(pub.getByRole("link", { name: "Passa alla versione 2014" })).toHaveCount(0);
  let index = await searchIndex();
  expect(index.rows.some(row => /^\/spell\/.*-2014$/.test(row[3]) || (row[4] ?? "").startsWith("/spell/"))).toBe(false);
  // The administrator: the 2014 choice of the pill labelled «Nascosta», the 2014 card with the bar and «Mostra».
  await page.goto("/grimorio");
  await pill(page).click();
  await expect(page.locator('[data-part="incantesimi:2014"]')).toContainText("Nascosta");
  await page.keyboard.press("Escape");
  expect((await page.goto("/spell/palla-di-fuoco-2014")).status()).toBe(200);
  await expect(page.locator("form").filter({ hasText: "Nascosta" }).getByRole("button", { name: "Mostra" })).toBeVisible();
  // The section wins over its parts and keeps them: hidden and shown again, 2014 is still hidden.
  await toggleSection("Incantesimi", true);
  await unavailable("/spell/palla-di-fuoco");
  await toggleSection("Incantesimi", false);
  await pub.goto("/grimorio");
  await expect(pill(pub)).toHaveCount(0);
  // «Mostra» from the bar of the card puts 2014 back.
  await page.goto("/spell/palla-di-fuoco-2014");
  await page.locator("form").filter({ hasText: "Nascosta" }).getByRole("button", { name: "Mostra" }).click();
  await expect(page.locator("form").filter({ hasText: "Nascosta" })).toHaveCount(0);
  expect((await pub.goto("/spell/palla-di-fuoco-2014")).status()).toBe(200);
  await pub.goto("/grimorio");
  await expect(pill(pub)).toBeVisible();

  // Edizione 2014 of the weapons: no selector, no 2014 → 2024 box; Armi tile «Parti nascoste» in the admin home.
  await togglePart("armi", "Edizione 2014", true);
  await pub.goto("/equipaggiamento/armi");
  await expect(pill(pub)).toHaveCount(0);
  await pub.goto("/equipaggiamento/armi/tridente");
  await expect(selector(pub)).toHaveCount(0);
  await expect(pub.getByRole("heading", { name: "2014 → 2024" })).toHaveCount(0);
  await page.goto("/admin");
  const armiTile = page.getByRole("region", { name: /^Contenuti 20\d\d$/ }).getByRole("link").filter({ hasText: "Armi" });
  await expect(armiTile.getByText("Parti nascoste", { exact: true })).toBeVisible();
  await expect(armiTile.getByText("Nascosta", { exact: true })).toHaveCount(0);
  await togglePart("armi", "Edizione 2014", false);
  // The 2014 → 2024 box alone; Dotazioni.
  await togglePart("armi", "Riquadro «2014 → 2024»", true);
  await togglePart("avventura", "Blocco «Dotazioni»", true);
  await pub.goto("/equipaggiamento/armi/tridente");
  await expect(selector(pub)).toBeVisible();
  await expect(pub.getByRole("heading", { name: "2014 → 2024" })).toHaveCount(0);
  await pub.goto("/equipaggiamento/avventura");
  await expect(pub.getByRole("heading", { name: "Dotazioni" })).toHaveCount(0);
  await expect(pub.getByRole("heading", { name: "Tutti gli oggetti" })).toBeVisible();
  await page.goto("/equipaggiamento/armi/tridente");
  await expect(page.locator('[data-part="armi:confronto"]')).toContainText("Nascosta");
  await page.goto("/equipaggiamento/avventura");
  await expect(page.getByRole("heading", { name: /Dotazioni/ })).toContainText("Nascosta");
  await togglePart("armi", "Riquadro «2014 → 2024»", false);
  await togglePart("avventura", "Blocco «Dotazioni»", false);

  // Bestiario: Animali hidden → no «Animali» in the Categoria filter (Tutti, Mostri and Homebrew stay), animal cards 404, no animal in the search.
  await togglePart("bestiario", "Raccolta Animali", true);
  await pub.goto("/bestiario");
  await pub.getByRole("button", { name: "Filtri" }).click();
  await expect(pub.getByRole("group", { name: "Categoria" }).getByRole("button")).toHaveText(["Tutti", "Mostri", "Homebrew"]);
  await pub.keyboard.press("Escape");
  await unavailable("/mostro/alce");
  index = await searchIndex();
  expect(index.rows.some(row => row[3] === "/mostro/alce")).toBe(false);
  expect((await page.goto("/mostro/alce")).status()).toBe(200);
  await togglePart("bestiario", "Raccolta Animali", false);
  expect((await pub.goto("/mostro/alce")).status()).toBe(200);

  // Class sheet: tabs, rows, spell list and button hidden; the subclass leaves the search.
  const classParts = ["Tab Tabella", "Tab Sottoclasse", "Riga «Abilità ed equipaggiamento iniziale»", "Riga «Diventare un…»", "Lista degli incantesimi", "Pulsante «Incantesimi del…»"];
  for (const title of classParts) await togglePart("classi", title, true);
  await pub.goto("/classi/mago");
  const body = pub.locator("main");
  await expect(body.getByRole("tab").filter({ visible: true })).toHaveText(["Privilegi"]);
  await expect(body.getByText("Abilità ed equipaggiamento iniziale")).toHaveCount(0);
  await expect(body.getByText(/^Diventare un/)).toHaveCount(0);
  for (const key of ["abilita", "diventare", "lista-incantesimi", "incantesimi-del", "tab-tabella", "tab-sottoclasse"]) await expect(pub.locator(`[data-part="classi:${key}"]`)).toHaveCount(0);
  await expect(pub.getByRole("link", { name: "Incantesimi del mago →" })).toHaveCount(0);
  index = await searchIndex();
  expect(index.rows.some(row => row[3].includes("#sottoclasse"))).toBe(false);
  await page.goto("/classi/mago");
  const tabs = page.locator("main").getByRole("tab").filter({ visible: true });
  await expect(tabs).toHaveCount(3);
  await expect(tabs.nth(1)).toContainText("Nascosta");
  for (const width of [360, 375, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await pub.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `admin class ${width}`).toBeLessThanOrEqual(width);
    await pub.goto("/classi/mago");
    expect(await pub.evaluate(() => document.documentElement.scrollWidth), `public class ${width}`).toBeLessThanOrEqual(width);
    for (const box of await tabs.evaluateAll(list => list.map(t => t.getBoundingClientRect().height))) expect(box).toBeGreaterThanOrEqual(44);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await pub.setViewportSize({ width: 390, height: 844 });
  for (const title of classParts) await togglePart("classi", title, false);

  // Both editions of the conditions hidden: the section behaves as hidden; «Mostra» in the band shows them again.
  await togglePart("condizioni", "Edizione 2014", true);
  await togglePart("condizioni", "Edizione 2024", true);
  await unavailable("/compendio/condizioni");
  await unavailable("/manuale/condizioni-accecato");
  await pub.goto("/compendio");
  await expect(pub.getByRole("link", { name: /Condizioni/ })).toHaveCount(0);
  await page.goto("/compendio/condizioni");
  await page.getByRole("note").getByRole("button", { name: "Mostra" }).click();
  await expect(page.getByRole("note")).toHaveCount(0);
  expect((await pub.goto("/compendio/condizioni")).status()).toBe(200);
  await expect(pill(pub)).toBeVisible();

  // Avanzamento: blocks one by one, all four → unavailable; the band shows them all again.
  const blocks = ["Tabella di avanzamento", "Punti ferita fissi per classe", "Talenti bonus oltre il 20º livello"];
  for (const title of blocks) await togglePart("avanzamento", title, true);
  await pub.goto("/avanzamento");
  await expect(pub.locator("main h2")).toHaveText(["Calcolatore di PE"]);
  await page.goto("/avanzamento");
  await expect(page.locator('[data-part="avanzamento:tabella"]')).toContainText("Nascosta");
  for (const width of [360, 375, 390]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `admin avanzamento ${width}`).toBeLessThanOrEqual(width);
    expect((await page.locator('[data-part="avanzamento:tabella"]').getByRole("button", { name: "Mostra" }).boundingBox()).height).toBeGreaterThanOrEqual(44);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await togglePart("avanzamento", "Calcolatore di PE", true);
  await unavailable("/avanzamento");
  await page.goto("/avanzamento");
  await page.getByRole("note").getByRole("button", { name: "Mostra" }).click();
  await expect(page.getByRole("note")).toHaveCount(0);
  await pub.goto("/avanzamento");
  await expect(pub.locator("main h2")).toHaveCount(4);

  // The log: section, part, new state.
  await page.goto("/admin/registro?sezione=sezioni&stato=tutte");
  const log = page.getByRole("list", { name: "Modifiche" }).locator(":scope > li");
  await expect(log.filter({ hasText: "Classi · Tab Tabella · visibilità" })).toHaveCount(2);
  await expect(log.filter({ hasText: "Avanzamento · Calcolatore di PE · visibilità" }).first()).toContainText("Visibile");

  // Everything visible again; the pages built meanwhile are built again for the next server (see the sections test).
  await page.goto("/admin/sezioni");
  await expect(page.getByText("10 visibili")).toBeVisible();
  await expect(page.getByText(/parti? nascost/)).toHaveCount(0);
  for (const path of ["/", "/grimorio", "/spell/palla-di-fuoco", "/spell/palla-di-fuoco-2014", "/bestiario", "/mostro/alce", "/classi", "/classi/mago", "/compendio", "/compendio/condizioni",
    "/manuale/condizioni-accecato", "/equipaggiamento/armi", "/equipaggiamento/armi/tridente", "/equipaggiamento/avventura", "/avanzamento", "/preferiti", "/ricerca-indice.json"]) {
    expect((await pub.request.get(path)).status(), path).toBe(200);
  }
  await publicContext.close();
  expect(errors).toEqual([]);
});

test("«la tua edizione» with 2014 hidden in every section: no first launch, everything in 2024, the pill does not open", async ({ page, browser }) => {
  test.setTimeout(300_000);
  const sections = ["incantesimi", "bestiario", "classi", "armi", "armature", "avventura", "strumenti", "oggetti-magici", "condizioni"];
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByRole("heading", { name: "Amministrazione" })).toBeVisible();
  const opener = key => page.locator(`button[aria-controls="parti-${key}"]`);
  const toggle2014 = async (key, hide) => {
    if (!page.url().endsWith("/admin/sezioni")) await page.goto("/admin/sezioni");
    if ((await opener(key).getAttribute("aria-expanded")) !== "true") await opener(key).click();
    const box = page.locator(`#parti-${key}`);
    await box.getByRole("button", { name: `${hide ? "Nascondi" : "Mostra"} Edizione 2014`, exact: true }).click();
    await expect(box.getByRole("button", { name: `${hide ? "Mostra" : "Nascondi"} Edizione 2014`, exact: true })).toBeEnabled();
    await expect(page.getByRole("status")).toHaveText(`Edizione 2014 ora è ${hide ? "nascosta" : "visibile"}`);
  };
  for (const key of sections) await toggle2014(key, true);

  // A visitor with nothing chosen, and one who had chosen 2014.
  const publicContext = await browser.newContext({ ...devices["iPhone 13"], baseURL: test.info().project.use.baseURL });
  await publicContext.addInitScript(() => window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)));
  const pub = await publicContext.newPage();
  await expect.poll(async () => { await pub.goto("/"); return pub.getByText("Edizione 2024", { exact: true }).filter({ visible: true }).count(); }).toBe(1);
  await pub.waitForTimeout(500);
  await expect(pub.locator("[data-first-launch]")).toHaveCount(0);
  await expect(pub.getByRole("button", { name: /Edizione 20\d\d/ })).toHaveCount(0);
  await expect(pub.getByRole("button", { name: "Cerca nel Grimorio 2024…" })).toBeVisible();
  await pub.evaluate(() => window.localStorage.setItem("grimorio.edizione", "2014"));
  for (const path of ["/grimorio", "/bestiario", "/classi/mago", "/oggetti-magici"]) {
    await pub.goto(path);
    await expect(pub.getByRole("button", { name: /^Edizione 20\d\d: cambia la tua edizione$/ }).filter({ visible: true }), path).toHaveCount(0);
  }
  await pub.goto("/grimorio");
  await expect(pub.locator('main a[href^="/spell/"]').first()).not.toHaveAttribute("href", /-2014$/);
  await publicContext.close();

  // Everything visible again; the pages built meanwhile are built again for the next server.
  for (const key of sections) await toggle2014(key, false);
  await page.goto("/admin/sezioni");
  await expect(page.getByText(/parti? nascost/)).toHaveCount(0);
  for (const path of ["/", "/grimorio", "/bestiario", "/classi", "/classi/mago", "/oggetti-magici", "/compendio/condizioni", "/equipaggiamento/armi", "/equipaggiamento/armature",
    "/equipaggiamento/avventura", "/equipaggiamento/strumenti", "/ricerca-indice.json"]) {
    expect((await page.request.get(path)).status(), path).toBe(200);
  }
});
