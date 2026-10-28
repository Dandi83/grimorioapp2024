import { test, expect } from "@playwright/test";

// The first visit (canvas «Prima visita Il Grimorio.App»): the edition pill centred on the Home, the thin
// statistics bar counted by default with «No» to be left out, the invite to install the app never together with
// the bar, the switch of «Come usiamo i dati». The statistics server is simulated (the test server never collects).
const SHOTS = process.env.PRIMA_VISITA_SHOTS;
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

/** /api/analytics as on ilgrimorio.app: counting on, the answer of this browser kept like the cookie. */
async function statistics(context, { consent = null } = {}) {
  const state = { consent, events: [], choices: [] };
  await context.route("**/api/analytics", async route => {
    const request = route.request();
    if (request.method() === "GET") return route.fulfill({ json: { enabled: true, excluded: false, consent: state.consent } });
    const body = JSON.parse(request.postData() || "{}");
    if (body.consent) {
      state.consent = body.consent;
      state.choices.push(body.consent);
      return route.fulfill({ json: { ok: true, consent: body.consent } });
    }
    state.events.push({ ...body, answer: state.consent });
    return route.fulfill({ json: { ok: true, stored: true } });
  });
  return state;
}
const views = state => state.events.filter(event => event.event === "page_view").length;
const bar = page => page.locator("[data-statistics-bar]");
const invite = page => page.locator("[data-install-prompt]");
const remember = (context, edition) => context.addInitScript(value => { try { localStorage.setItem("grimorio.edizione", value); } catch { /* no storage */ } }, edition);

test("Home: the edition pill centred on the picture, larger, without overlaps at 320, 390 and 768 px; its panel unchanged", async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem("grimorio.edizione", "2024"); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const pill = page.getByRole("button", { name: "Edizione 2024: cambia la tua edizione" });
    await expect(pill).toBeVisible();
    const box = await pill.boundingBox();
    const picture = await page.locator("#home-quote").locator("xpath=ancestor::section[1]").boundingBox();
    expect(Math.abs(box.x + box.width / 2 - width / 2), `${width}: centred`).toBeLessThanOrEqual(2);
    expect(Math.abs(box.y - picture.y - 20), `${width}: 20 px from the top of the picture`).toBeLessThanOrEqual(2);
    expect(box.height).toBeGreaterThanOrEqual(52);
    await expect(pill).toHaveCSS("font-size", "18px");
    await expect(pill).toHaveCSS("padding-left", "24px");
    expect(await pill.locator("svg").evaluate(svg => svg.getAttribute("width"))).toBe("20");
    // Nothing under it: the header above, the quote and the search below.
    const header = await page.locator("header").first().boundingBox();
    expect(box.y, `${width}: under the header`).toBeGreaterThanOrEqual(header.y + header.height);
    const quote = await page.locator("#home-quote").boundingBox();
    expect(box.y + box.height, `${width}: above the quote`).toBeLessThan(quote.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (SHOTS && width === 390) await page.screenshot({ path: `${SHOTS}/home-390.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Edizione 2024: cambia la tua edizione" }).click();
  const panel = page.getByRole("dialog", { name: "Scegli l’edizione" });
  await expect(panel).toHaveText("Scegli l’edizioneD&D 2024D&D 2014");
  // The pill of the computer column and those of the sections keep their size.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const side = page.getByRole("button", { name: "Edizione 2024: cambia la tua edizione" }).filter({ visible: true });
  await expect(side).toHaveCSS("font-size", "15px");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/grimorio");
  await expect(page.getByRole("button", { name: /^Edizione 2024: cambia la tua edizione$/ }).filter({ visible: true }).first()).toHaveCSS("font-size", "15px");
});

test("first visit: welcome screen, then the Home with the bar and no invite; counted before any answer; «Ok» closes the bar, the invite comes after", async ({ browser }) => {
  test.setTimeout(120_000);
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 }, userAgent: IPHONE, hasTouch: true, isMobile: true });
  const state = await statistics(context);
  const page = await context.newPage();
  await page.goto("/");
  const welcome = page.locator("[data-first-launch]");
  await expect(welcome).toBeVisible();
  // Counted from the first page, before any answer.
  await expect.poll(() => views(state)).toBeGreaterThanOrEqual(1);
  expect(state.events.every(event => event.answer === null)).toBe(true);
  expect(state.choices).toEqual([]);
  // Never over the welcome screen, the invite neither.
  await page.waitForTimeout(2000);
  await expect(bar(page)).toHaveCount(0);
  await expect(invite(page)).toHaveCount(0);
  await welcome.getByRole("button", { name: "D&D 2024", exact: true }).click();
  await expect(welcome).toHaveCount(0);
  // The bar after the choice: dark, «Statistiche anonime?», «Info» to «Come usiamo i dati», «No» and «Ok».
  await expect(bar(page)).toBeVisible();
  await expect(bar(page)).toHaveText("Statistiche anonime? InfoNoOk");
  await expect(bar(page)).toHaveCSS("background-color", "rgb(43, 33, 24)");
  await expect(bar(page).getByText("Statistiche anonime?")).toHaveCSS("font-size", "16px");
  await expect(bar(page).getByRole("link", { name: "Info" })).toHaveAttribute("href", "/privacy");
  await expect(bar(page).getByRole("link", { name: "Info" })).toHaveCSS("color", "rgb(224, 162, 26)");
  const ok = bar(page).getByRole("button", { name: "Ok" }), no = bar(page).getByRole("button", { name: "No" });
  await expect(ok).toHaveCSS("background-color", "rgb(224, 162, 26)");
  await expect(ok).toHaveCSS("color", "rgb(43, 33, 24)");
  await expect(no).toHaveCSS("border-top-color", "rgb(107, 84, 50)");
  for (const button of [ok, no]) expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
  // Above the bottom bar, never on it.
  const strip = await bar(page).boundingBox(), nav = await page.getByRole("navigation", { name: "Navigazione principale" }).boundingBox();
  expect(strip.y + strip.height).toBeLessThanOrEqual(nav.y + 1);
  // The search of the Home is never left under the bar.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const field = await page.getByRole("button", { name: "Cerca nel Grimorio 2024…" }).boundingBox();
  expect(field.y + field.height).toBeLessThanOrEqual(strip.y);
  await page.evaluate(() => window.scrollTo(0, 0));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/barra-390.png` });
  // Never together: no invite while the bar is open.
  await page.waitForTimeout(3000);
  await expect(invite(page)).toHaveCount(0);
  await ok.click();
  await expect(bar(page)).toHaveCount(0);
  expect(state.choices).toEqual(["accepted"]);
  // Then the invite, at its usual moment.
  await expect(invite(page)).toBeVisible({ timeout: 6000 });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/invito-390.png` });
  // Still counted after «Ok»; the bar does not come back.
  const before = views(state);
  await page.goto("/grimorio");
  await expect.poll(() => views(state)).toBeGreaterThan(before);
  await expect(bar(page)).toHaveCount(0);
  await context.close();
});

test("«No»: the bar closes and nothing is recorded after it, on any page; the bar never comes back", async ({ browser }) => {
  test.setTimeout(120_000);
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 } });
  await remember(context, "2014");
  await context.addInitScript(() => { try { localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
  const state = await statistics(context);
  const page = await context.newPage();
  await page.goto("/grimorio");
  await expect(bar(page)).toBeVisible();
  await expect.poll(() => views(state)).toBeGreaterThanOrEqual(1);
  // The end of a long list is never under the bar.
  await expect(page.getByRole("button", { name: /^Mostra altri/ })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
  const strip = await bar(page).boundingBox();
  const room = await page.evaluate(() => ({ padding: getComputedStyle(document.querySelector("main")).paddingBottom, scrolled: window.scrollY + window.innerHeight, height: document.documentElement.scrollHeight }));
  // Elements in the flow of the page (fixed ones, such as the bottom bar, are not content).
  const last = await page.locator("main").evaluate(main => {
    const items = [...main.querySelectorAll("li, button, a")].filter(element => {
      const rect = element.getBoundingClientRect();
      if (!rect.height) return false;
      for (let node = element; node; node = node.parentElement) if (["fixed", "sticky"].includes(getComputedStyle(node).position)) return false;
      return true;
    });
    const bottom = Math.max(...items.map(element => element.getBoundingClientRect().bottom));
    return { bottom, what: items.find(element => element.getBoundingClientRect().bottom === bottom)?.outerHTML.slice(0, 160) };
  });
  expect(last.bottom, `${last.what} ${JSON.stringify(room)}`).toBeLessThanOrEqual(strip.y);
  await bar(page).getByRole("button", { name: "No" }).click();
  await expect(bar(page)).toHaveCount(0);
  expect(state.choices).toEqual(["rejected"]);
  const counted = state.events.length;
  await page.getByRole("searchbox", { name: "Cerca un incantesimo" }).fill("palla di fuoco");
  await page.waitForTimeout(2000);
  for (const path of ["/bestiario", "/spell/palla-di-fuoco-2014", "/"]) {
    await page.goto(path);
    await page.waitForTimeout(800);
  }
  await page.reload();
  await page.waitForTimeout(1500);
  expect(state.events.length, "no event after «No»").toBe(counted);
  await expect(bar(page)).toHaveCount(0);
  await context.close();
});

test("«Come usiamo i dati»: what is counted and the switch «Contami nelle statistiche», off and on again", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 } });
  await remember(context, "2024");
  const state = await statistics(context, { consent: "accepted" });
  const page = await context.newPage();
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1, name: "Come usiamo i dati" })).toBeVisible();
  for (const text of ["Non conserviamo l’indirizzo IP", "Gli eventi si cancellano dopo 90 giorni", "Non costruiamo profili", "non usa cookie", "Da quella data non inviamo più niente a PostHog"])
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
  const toggle = page.getByRole("switch", { name: "Contami nelle statistiche" });
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/come-usiamo-i-dati-390.png` });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await expect(page.getByText("Non vieni contato: da questo browser non registriamo niente.")).toBeVisible();
  const counted = state.events.length;
  await page.goto("/grimorio");
  await page.waitForTimeout(1500);
  expect(state.events.length).toBe(counted);
  await page.goto("/privacy");
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  expect(state.choices).toEqual(["rejected", "accepted"]);
  await page.goto("/grimorio");
  await expect.poll(() => state.events.length).toBeGreaterThan(counted);
  await context.close();
});

test("computer: the bar at the bottom beside the side column, the Home with its pill in the column", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 1280, height: 800 } });
  await remember(context, "2024");
  await statistics(context);
  const page = await context.newPage();
  await page.goto("/");
  await expect(bar(page)).toBeVisible();
  const strip = await bar(page).boundingBox();
  expect(strip.x).toBeGreaterThanOrEqual(240);
  expect(Math.round(strip.y + strip.height)).toBe(800);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/home-computer.png` });
  await context.close();
});
