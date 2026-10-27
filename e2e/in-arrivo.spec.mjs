import { test, expect } from "@playwright/test";

// «Visibile · In arrivo · Nascosta» (/admin/sezioni): a section and a part in each state, as a visitor and as the
// administrator. «In arrivo»: the entry stays (bar, Compendio, Home, filters, blocks), attenuated with the pill,
// and opens «Sezione momentaneamente in costruzione» with «<name> · In arrivo»; the content is never served
// (page, direct link, search, catalogue). Local test database: everything goes back to «Visibile» at the end.
const stateRadio = (scope, title, label) => scope.getByRole("radiogroup", { name: `Stato di ${title}`, exact: true }).getByRole("radio", { name: label, exact: true });
const SHOTS = process.env.IN_ARRIVO_SHOTS;

async function login(page) {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
}

async function setSection(page, title, label) {
  if (!page.url().endsWith("/admin/sezioni")) await page.goto("/admin/sezioni");
  await stateRadio(page, title, label).click();
  await expect(page.getByRole("status")).toHaveText(`${title} ora è ${label.toLowerCase()}`);
  await expect(stateRadio(page, title, label)).toHaveAttribute("aria-checked", "true");
}

async function setPart(page, key, title, label) {
  if (!page.url().endsWith("/admin/sezioni")) await page.goto("/admin/sezioni");
  const opener = page.locator(`button[aria-controls="parti-${key}"]`);
  if ((await opener.getAttribute("aria-expanded")) !== "true") await opener.click();
  const box = page.locator(`#parti-${key}`);
  await stateRadio(box, title, label).click();
  await expect(page.getByRole("status")).toHaveText(`${title} ora è ${label.toLowerCase()}`);
  await expect(stateRadio(box, title, label)).toHaveAttribute("aria-checked", "true");
}

async function visitor(browser, width = 390) {
  const context = await browser.newContext({ viewport: { width, height: 844 } });
  await context.addInitScript(() => { try { localStorage.setItem("grimorio.edizione", "2024"); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  page.on("console", message => { if (message.type() === "error" && !/Failed to load resource/.test(message.text())) errors.push(message.text()); });
  return { page, errors, close: () => context.close() };
}

async function underConstruction(page, pill) {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sezione momentaneamente in costruzione");
  if (pill) await expect(page.locator("[data-soon-pill]")).toHaveText(`${pill} · In arrivo`);
  else await expect(page.locator("[data-soon-pill]")).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
});

test("In arrivo: entries attenuated with the pill, «in costruzione» page, content never served; admin sees all", async ({ page, browser }) => {
  test.setTimeout(400_000);
  await login(page);
  await page.goto("/admin/sezioni");
  await expect(page.getByText("0 in arrivo")).toBeVisible();
  // Every row has the three states, «Visibile» chosen (the rows of before: Visibile or Nascosta).
  await expect(page.getByRole("radiogroup")).toHaveCount(10);
  await expect(page.getByRole("radio", { name: "Visibile", checked: true })).toHaveCount(10);
  // Colors of the chosen state: green, amber, black (#1F6B45, #E0A21A, #2B2118).
  for (const [label, color] of [["In arrivo", "rgb(224, 162, 26)"], ["Nascosta", "rgb(43, 33, 24)"], ["Visibile", "rgb(31, 107, 69)"]]) {
    await setSection(page, "Classi", label);
    await expect(stateRadio(page, "Classi", label)).toHaveCSS("background-color", color);
  }

  // Sections: Incantesimi and Classi «In arrivo», Oggetti magici «Nascosta», the others «Visibile».
  await setSection(page, "Incantesimi", "In arrivo");
  await setSection(page, "Classi", "In arrivo");
  await setSection(page, "Oggetti magici", "Nascosta");
  // Parts: Raccolta Animali and Calcolatore di PE «In arrivo», Talenti «Nascosta», Tabella «Visibile».
  await setPart(page, "bestiario", "Raccolta Animali", "In arrivo");
  await setPart(page, "avanzamento", "Calcolatore di PE", "In arrivo");
  await setPart(page, "avanzamento", "Talenti bonus oltre il 20º livello", "Nascosta");
  await expect(page.getByText("2 in arrivo")).toBeVisible();
  await expect(page.getByText("1 nascosta", { exact: true })).toBeVisible();
  await expect(page.getByText("2 parti in arrivo")).toBeVisible();
  await expect(page.getByText("1 parte nascosta")).toBeVisible();

  // Visitor, phone.
  const guest = await visitor(browser);
  const pub = guest.page;
  await pub.goto("/");
  const bar = pub.getByRole("navigation", { name: "Navigazione principale" });
  const spells = bar.locator("li[data-soon]");
  await expect(spells).toHaveCount(1);
  await expect(spells).toContainText("Incantesimi");
  await expect(spells).toContainText("In arrivo");
  expect(await spells.evaluate(li => getComputedStyle(li).opacity)).toBe("0.6");
  await expect(spells.getByRole("link")).toHaveAttribute("href", "/in-arrivo/incantesimi");
  await spells.getByRole("link").click();
  await expect(pub).toHaveURL(/\/in-arrivo\/incantesimi$/);
  await underConstruction(pub, "Incantesimi");
  expect(await pub.locator("[data-soon-pill]").evaluate(el => [getComputedStyle(el).backgroundColor, getComputedStyle(el).color])).toEqual(["rgb(224, 162, 26)", "rgb(43, 33, 24)"]);
  if (SHOTS) await pub.screenshot({ path: `${SHOTS}/in-arrivo-incantesimi-390.png` });
  // Direct links: the page «in costruzione», nothing of the content.
  for (const [path, pill] of [["/grimorio", "Incantesimi"], ["/spell/palla-di-fuoco", "Incantesimi"], ["/classi/mago", "Classi"]]) {
    const response = await pub.goto(path);
    expect(response.status(), path).toBe(404);
    await underConstruction(pub, pill);
    const html = await response.text();
    // Nothing of the card, also in the data of the page and in its title.
    expect(html, path).not.toMatch(/Testo integrale|data-source-box|Dado Vita|Palla di fuoco|Mago — Classi/i);
  }
  // Hidden (not «In arrivo»): the same page, without the pill; no entry anywhere.
  await pub.goto("/oggetti-magici");
  await underConstruction(pub, undefined);
  // Compendio: Classi attenuated with the pill and «Ci stiamo lavorando»; Oggetti magici gone; the others as before.
  await pub.goto("/compendio");
  const classes = pub.locator("main li[data-soon]");
  await expect(classes).toHaveCount(1);
  await expect(classes).toContainText("Classi");
  await expect(classes).toContainText("In arrivo");
  await expect(classes).toContainText("Ci stiamo lavorando");
  await expect(classes).not.toContainText("Barbaro");
  expect(await classes.locator("a").evaluate(a => getComputedStyle(a).borderStyle)).toBe("dashed");
  await expect(pub.getByRole("link", { name: /Oggetti magici/ })).toHaveCount(0);
  await expect(pub.getByRole("link", { name: /Condizioni/ })).toHaveCount(1);
  if (SHOTS) await pub.screenshot({ path: `${SHOTS}/in-arrivo-compendio-390.png`, fullPage: true });
  await classes.locator("a").click();
  await expect(pub).toHaveURL(/\/in-arrivo\/classi$/);
  await underConstruction(pub, "Classi");
  // Avanzamento: Tabella shown, Calcolatore in its place «In arrivo», Talenti gone.
  await pub.goto("/avanzamento");
  await expect(pub.locator('[data-part="avanzamento:tabella"]')).toBeVisible();
  const calc = pub.locator('[data-part="avanzamento:calcolatore"][data-soon]');
  await expect(calc).toContainText("Calcolatore di PE");
  await expect(calc).toContainText("In arrivo");
  await expect(calc).toContainText("Ci stiamo lavorando");
  await expect(pub.locator("#calcolatore")).toHaveCount(0);
  await expect(pub.locator('[data-part="avanzamento:talenti"]')).toHaveCount(0);
  await calc.getByRole("link").click();
  await underConstruction(pub, "Calcolatore di PE");
  // Bestiario: the Animali collection is an entry in the filters, its creatures are not served.
  await pub.goto("/bestiario");
  await pub.locator("li.catalog-row").first().waitFor();
  await pub.getByRole("button", { name: /^Filtri/ }).click();
  const animals = pub.getByRole("dialog").locator('[data-part="bestiario:animali"][data-soon]');
  await expect(animals).toContainText("Animali");
  await expect(animals).toContainText("In arrivo");
  await animals.click();
  await expect(pub).toHaveURL(/\/in-arrivo\/bestiario%3Aanimali$/);
  await underConstruction(pub, "Raccolta Animali");
  const response = await pub.goto("/mostro/alce");
  expect(response.status()).toBe(404);
  await underConstruction(pub, undefined);
  // Search and catalogue: nothing of the content «In arrivo».
  const index = await (await pub.request.get("/ricerca-indice.json")).text();
  expect(index).not.toMatch(/"\/spell\/|"\/classi\/|"\/mostro\/alce"/);
  const bestiary = await (await pub.request.get("/api/catalogo/bestiario")).json();
  expect(bestiary.monsters.some(monster => monster.id === "alce")).toBe(false);
  // An address of something not «In arrivo» does not open the page.
  expect((await pub.request.get("/in-arrivo/bestiario")).status()).toBe(404);
  expect((await pub.request.get("/in-arrivo/oggetti-magici")).status()).toBe(404);
  expect(guest.errors).toEqual([]);
  await guest.close();

  // Visitor, computer: the side column and the Home shortcuts.
  const desk = await visitor(browser, 1280);
  await desk.page.goto("/");
  const side = desk.page.getByRole("navigation", { name: "Navigazione laterale" }).locator("li[data-soon]");
  await expect(side).toContainText("Incantesimi");
  await expect(side).toContainText("In arrivo");
  const shortcut = desk.page.getByRole("navigation", { name: "Scorciatoie" }).locator("a[data-soon]");
  await expect(shortcut).toContainText("Incantesimi");
  await expect(shortcut).toContainText("In arrivo");
  await expect(shortcut).not.toContainText(/\d+ del/);
  await expect(shortcut).toHaveAttribute("href", "/in-arrivo/incantesimi");
  if (SHOTS) await desk.page.screenshot({ path: `${SHOTS}/in-arrivo-home-1280.png` });
  expect(desk.errors).toEqual([]);
  await desk.close();

  // The administrator: everything, with the state label; the content of a section «In arrivo» with its band.
  await page.goto("/compendio");
  const adminClasses = page.locator("main li").filter({ hasText: "Classi" });
  await expect(adminClasses).toContainText("In arrivo");
  await expect(adminClasses).toContainText("Barbaro");
  await expect(page.getByRole("link", { name: /Oggetti magici/ })).toContainText("Nascosta");
  await page.goto("/classi/mago");
  await expect(page.getByRole("note")).toContainText("In arrivo");
  await expect(page.locator("main")).toContainText("Dado Vita");
  await page.goto("/avanzamento");
  await expect(page.locator("#calcolatore")).toBeVisible();
  await expect(page.locator('[data-part="avanzamento:calcolatore"] [data-soon-tag]')).toBeVisible();
  // The log keeps the three states.
  await page.goto("/admin/registro?sezione=sezioni&stato=tutte");
  const log = page.getByRole("list", { name: "Modifiche" }).locator("[data-log-entry]");
  await expect(log.filter({ hasText: "Incantesimi · visibilità → In arrivo" }).first()).toBeVisible();
  await expect(log.filter({ hasText: "Oggetti magici · visibilità → Nascosta" }).first()).toBeVisible();

  // Back to the start.
  for (const title of ["Incantesimi", "Classi", "Oggetti magici"]) await setSection(page, title, "Visibile");
  await setPart(page, "bestiario", "Raccolta Animali", "Visibile");
  await setPart(page, "avanzamento", "Calcolatore di PE", "Visibile");
  await setPart(page, "avanzamento", "Talenti bonus oltre il 20º livello", "Visibile");
  await expect(page.getByText("10 visibili")).toBeVisible();
  // The pages built while the sections were closed are built again now, so the next server finds them current
  // (same as e2e/sezioni.spec.mjs).
  const after = await visitor(browser);
  for (const path of ["/", "/grimorio", "/spell/palla-di-fuoco", "/classi", "/classi/mago", "/oggetti-magici", "/bestiario", "/mostro/alce", "/avanzamento", "/compendio", "/equipaggiamento", "/preferiti", "/ricerca-indice.json"]) {
    expect((await after.page.request.get(path)).status(), path).toBe(200);
  }
  await after.close();
});
