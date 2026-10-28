import { test, expect, devices } from "@playwright/test";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";

// «Sostieni il Grimorio» (canvas «Sostieni il Grimorio»): with the real Ko-fi address (lib/support.ts, PROMPT 9).
// Ko-fi is never opened: its tab is answered by the test itself.
// The statistics server is simulated in the public tests; the reserved page reads rows of the local test database.
const SHOTS = process.env.SOSTIENI_SHOTS;
const KOFI = "https://ko-fi.com/ilgrimorioapp";

async function visitor(browser, { days = 0, width = 390, consent = "accepted", paused = false, invite = false, ratingPaused = true } = {}) {
  const context = await browser.newContext({
    ...(width === 390 ? devices["iPhone 13"] : { viewport: { width, height: 900 } }),
    baseURL: test.info().project.use.baseURL,
  });
  await context.addInitScript(({ days, paused, invite, ratingPaused }) => {
    try {
      localStorage.setItem("grimorio.edizione", "2024");
      if (!invite) localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5));
      if (!sessionStorage.getItem("e2e-days")) {
        localStorage.setItem("grimorio.giorni-di-visita", JSON.stringify(["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"].slice(0, days)));
        sessionStorage.setItem("e2e-days", "1");
      }
      // The question with the faces already answered (it would come first from the 3rd day).
      if (ratingPaused) localStorage.setItem("grimorio.valutazione-fino-al", String(Date.now() + 864e5));
      if (paused) localStorage.setItem("grimorio.sostieni-fino-al", String(Date.now() + 864e5));
    } catch { /* no storage */ }
  }, { days, paused, invite, ratingPaused });
  const state = { consent, events: [] };
  await context.route("**/api/analytics", async route => {
    const request = route.request();
    if (request.method() === "GET") return route.fulfill({ json: { enabled: true, excluded: false, consent: state.consent } });
    const body = JSON.parse(request.postData() || "{}");
    if (body.consent) { state.consent = body.consent; return route.fulfill({ json: { ok: true, consent: body.consent } }); }
    state.events.push(body);
    return route.fulfill({ json: { ok: true, stored: true } });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  return { context, page, state, errors };
}
const named = (state, name) => state.events.filter(event => event.event === name);
const card = page => page.getByRole("region", { name: "Ti serve al tavolo? Offrimi un caffè" });

test("the link: in the Home row with «Info e note legali», in /info and in the side column; it opens /sostieni", async ({ browser }) => {
  const { context, page, state } = await visitor(browser);
  await page.goto("/");
  const link = page.locator('[data-support-link="home"]');
  await expect(link).toHaveText("Sostieni il Grimorio");
  await expect(link.locator("svg")).toHaveCount(1);
  await expect(link).toHaveCSS("color", "rgb(122, 31, 43)");
  await expect(link).toHaveCSS("font-weight", "700");
  expect((await link.boundingBox()).height).toBeGreaterThanOrEqual(44);
  // The same row as «Info e note legali»: on the left, Info on the right.
  const info = await page.getByRole("link", { name: "Info e note legali" }).boundingBox(), own = await link.boundingBox();
  expect(Math.abs(own.y - info.y)).toBeLessThanOrEqual(4);
  expect(own.x).toBeLessThan(info.x);
  if (SHOTS) {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.screenshot({ path: `${SHOTS}/1-link-390.png` });
  }
  await link.click();
  await expect(page).toHaveURL(/\/sostieni$/);
  await expect.poll(() => named(state, "support_link").map(event => event.from)).toEqual(["home"]);
  await page.goto("/info");
  await page.locator('[data-support-link="info"]').click();
  await expect(page).toHaveURL(/\/sostieni$/);
  await context.close();

  const desk = await visitor(browser, { width: 1280 });
  await desk.page.goto("/grimorio");
  const side = desk.page.locator('[data-support-link="colonna"]');
  await expect(side).toBeVisible();
  const legal = await desk.page.locator("nav").getByRole("link", { name: "Info e note legali" }).boundingBox();
  expect(Math.abs((await side.boundingBox()).y - legal.y)).toBeLessThan(80);
  if (SHOTS) await desk.page.screenshot({ path: `${SHOTS}/1-colonna-1280.png` });
  await desk.context.close();
});

test("/sostieni: the exact texts, 3 € chosen, Ko-fi in a new tab, «Non puoi donare?» shares; the events", async ({ browser }) => {
  const { context, page, state, errors } = await visitor(browser);
  await context.addInitScript(() => {
    window.__shared = [];
    Object.defineProperty(navigator, "share", { configurable: true, value: async data => { window.__shared.push(data); } });
  });
  const answer = await page.goto("/sostieni");
  expect(answer.status()).toBe(200);
  await expect(page).toHaveTitle("Sostieni il Grimorio — Il Grimorio.App");
  await expect(page.getByRole("button", { name: "‹ Indietro" })).toBeVisible();
  await expect(page.locator('main img[src="/icon-192.png"]')).toHaveAttribute("alt", "");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sostieni il Grimorio");
  const motto = page.getByText("Ogni grimorio cresce con chi lo sfoglia.");
  await expect(motto).toHaveCSS("font-style", "italic");
  await expect(motto).toHaveCSS("font-size", "21px");
  await expect(motto).toHaveCSS("color", "rgb(122, 31, 43)");
  await expect(page.getByText("Il Grimorio si arricchisce una pagina alla volta, tra una sessione e l'altra, per i master e i giocatori della community. Se ti ha salvato un turno, una ricerca o un'intera serata di gioco, puoi aiutarlo a crescere ancora.")).toBeVisible();
  const help = page.getByRole("region", { name: "Il tuo aiuto, in concreto" });
  await expect(help.locator("li")).toHaveText(["tiene online il Grimorio, giorno e notte", "porta nuove sezioni e strumenti per i master", "dà il tempo di controllare e migliorare ogni scheda"]);
  const amounts = page.getByRole("group", { name: "Importo" }).getByRole("button");
  await expect(amounts).toHaveText(["1 €un dado", "3 €un caffè", "5 €una pozione"]);
  await expect(amounts.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(amounts.nth(0)).toHaveAttribute("aria-pressed", "false");
  const button = page.locator("[data-support-button]");
  await expect(button).toHaveText("Sostieni con 3 €");
  await expect(button).toHaveAttribute("href", KOFI);
  await expect(button).toHaveAttribute("target", "_blank");
  await expect(button).toHaveAttribute("rel", /noopener/);
  await expect(page.getByText("Pagamento sicuro su Ko-fi. Contributo libero, una volta sola.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/2-pagina-390.png`, fullPage: true });
  await expect.poll(() => named(state, "support_page").length).toBe(1);

  await amounts.nth(2).click();
  await expect(amounts.nth(2)).toHaveAttribute("aria-pressed", "true");
  await expect(button).toHaveText("Sostieni con 5 €");
  // Ko-fi opens in a new tab (blocked here: nothing leaves the test).
  await context.route("https://ko-fi.com/**", route => route.fulfill({ body: "Ko-fi (finto)" }));
  const [popup] = await Promise.all([context.waitForEvent("page"), button.click()]);
  await expect(popup).toHaveURL(KOFI);
  await popup.close();
  await expect.poll(() => named(state, "support_click").map(event => event.amount)).toEqual([5]);

  await page.getByRole("button", { name: "Non puoi donare? Condividilo con il tuo gruppo" }).click();
  await expect.poll(() => page.evaluate(() => window.__shared.map(data => data.url))).toEqual(["https://ilgrimorio.app/?da=amico"]);
  await expect.poll(() => named(state, "share_tap").map(event => event.from)).toEqual(["sostieni"]);
  expect(errors).toEqual([]);
  await context.close();

  const desk = await visitor(browser, { width: 1280 });
  await desk.page.goto("/sostieni");
  await expect(desk.page.getByRole("heading", { level: 1 })).toHaveText("Sostieni il Grimorio");
  if (SHOTS) await desk.page.screenshot({ path: `${SHOTS}/2-pagina-1280.png`, fullPage: true });
  await desk.context.close();
});

test("the occasional card: only from the 5th day, then 2 months of pause; never with the faces, the bar, the invite; after «No» it still never counts", async ({ browser }) => {
  for (const days of [0, 3]) {
    const early = await visitor(browser, { days });
    await early.page.goto("/");
    await expect(early.page.getByRole("button", { name: "Condividi il Grimorio" })).toBeVisible();
    await early.page.waitForTimeout(600);
    await expect(card(early.page), `visit ${days + 1}`).toHaveCount(0);
    await early.context.close();
  }
  const fifth = await visitor(browser, { days: 4 });
  await fifth.page.goto("/");
  await expect(card(fifth.page)).toBeVisible();
  await expect(card(fifth.page)).toHaveCSS("background-color", "rgb(43, 33, 24)");
  await expect(card(fifth.page).locator("svg").first()).toHaveAttribute("stroke", "#E0A21A");
  await expect(card(fifth.page)).toContainText("Il Grimorio cresce grazie alla passione e a chi lo sostiene. Anche un piccolo aiuto fa la differenza.");
  // Above «Porta il Grimorio al tavolo», in the page flow.
  const above = await card(fifth.page).boundingBox(), share = await fifth.page.getByRole("button", { name: "Condividi il Grimorio" }).boundingBox();
  expect(above.y + above.height).toBeLessThanOrEqual(share.y);
  if (SHOTS) await fifth.page.screenshot({ path: `${SHOTS}/3-card-390.png` });
  await card(fifth.page).getByRole("link", { name: "Sostieni il Grimorio" }).click();
  await expect(fifth.page).toHaveURL(/\/sostieni$/);
  await expect.poll(() => named(fifth.state, "support_link").map(event => event.from)).toEqual(["card"]);
  await fifth.page.goto("/");
  await expect(fifth.page.getByRole("button", { name: "Condividi il Grimorio" })).toBeVisible();
  await fifth.page.waitForTimeout(600);
  await expect(card(fifth.page)).toHaveCount(0);
  expect(await fifth.page.evaluate(() => Number(localStorage.getItem("grimorio.sostieni-fino-al")) - Date.now())).toBeGreaterThan(59 * 864e5);
  await fifth.context.close();

  // The × too: not again for 2 months.
  const closed = await visitor(browser, { days: 4 });
  await closed.page.goto("/");
  await card(closed.page).getByRole("button", { name: "Chiudi" }).click();
  await expect(card(closed.page)).toHaveCount(0);
  await closed.page.reload();
  await closed.page.waitForTimeout(600);
  await expect(card(closed.page)).toHaveCount(0);
  await closed.context.close();

  // The question with the faces due: it comes first, the card waits for another visit.
  const faces = await visitor(browser, { days: 4, ratingPaused: false });
  await faces.page.goto("/");
  await expect(faces.page.getByRole("region", { name: "Come ti trovi con il Grimorio?" })).toBeVisible();
  await expect(card(faces.page)).toHaveCount(0);
  await faces.context.close();

  // The statistics bar: the card waits for the next visit, even after «Ok».
  const bar = await visitor(browser, { days: 4, consent: null });
  await bar.page.goto("/");
  await expect(bar.page.locator("[data-statistics-bar]")).toBeVisible();
  await bar.page.locator("[data-statistics-bar]").getByRole("button", { name: "Ok" }).click();
  await bar.page.waitForTimeout(600);
  await expect(card(bar.page)).toHaveCount(0);
  await bar.context.close();

  // The invite to install: the card waits.
  const invite = await visitor(browser, { days: 4, invite: true });
  await invite.page.goto("/");
  await expect(invite.page.locator("[data-install-prompt]")).toBeVisible();
  await expect(card(invite.page)).toHaveCount(0);
  await invite.context.close();

  // «No» to the statistics: the card may show, but no event is ever sent.
  const no = await visitor(browser, { days: 4, consent: "rejected" });
  await no.page.goto("/");
  await expect(card(no.page)).toBeVisible();
  await card(no.page).getByRole("link", { name: "Sostieni il Grimorio" }).click();
  await expect(no.page).toHaveURL(/\/sostieni$/);
  await no.page.waitForTimeout(500);
  expect(no.state.events).toEqual([]);
  await no.context.close();

  const desk = await visitor(browser, { days: 4, width: 1280 });
  await desk.page.goto("/");
  await expect(card(desk.page)).toBeVisible();
  if (SHOTS) await desk.page.screenshot({ path: `${SHOTS}/3-card-1280.png` });
  await desk.context.close();
});

test("«Sostegno» in Statistiche: people who opened the page and tapped the button, by amount; a line about Ko-fi", async ({ page }) => {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
  await page.goto("/admin/statistiche");
  const db = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await db.connect();
  try {
    const rows = [["s1", "support_page", null], ["s1", "support_page", null], ["s1", "support_click", 3], ["s2", "support_page", null], ["s2", "support_click", 5], ["s2", "support_click", 5], ["s3", "support_click", 3]];
    for (const [who, name, amount] of rows)
      await db.query(`INSERT INTO grimorio_analytics_events (id, visitor_id, session_id, view_id, event_name, path, source, amount)
        VALUES ($1, $2, $3, $4, $5, '/sostieni', 'direct', $6)`, [randomUUID(), `prova-sostieni-${who}`, randomUUID(), randomUUID(), name, amount]);
    await page.goto("/admin/statistiche?periodo=7");
    const block = page.locator("[data-support-stats]");
    await expect(block.getByRole("heading", { name: "Sostegno" })).toBeVisible();
    await expect(block.locator("[data-support-opened]")).toHaveText("2");
    await expect(block.locator("[data-support-clicked]")).toHaveText("3");
    await expect(block.locator('[data-support-amount="1"]')).toHaveText("0");
    await expect(block.locator('[data-support-amount="3"]')).toHaveText("2");
    await expect(block.locator('[data-support-amount="5"]')).toHaveText("1");
    await expect(block).toContainText("Le donazioni vere si vedono su Ko-fi");
    if (SHOTS) await block.screenshot({ path: `${SHOTS}/4-sostegno-admin.png` });
  } finally {
    await db.query("DELETE FROM grimorio_analytics_events WHERE visitor_id LIKE 'prova-sostieni-%'");
    await db.end();
  }
});
