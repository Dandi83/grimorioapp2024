import { test, expect, devices } from "@playwright/test";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";

// The canvas «Valutazione Il Grimorio.App» (28 October 2026): the card «Porta il Grimorio al tavolo» always in the
// Home, the question with three faces from the 3rd day of visit, what follows the vote, the friend's link
// (?da=amico) and the page «Come si trovano?» of the reserved area. The statistics server is simulated in the
// public tests (the test server never collects); the reserved page reads rows written only in the local test database.
const SHOTS = process.env.VALUTAZIONE_SHOTS;
const TEXT = "Ti consiglio Il Grimorio.App: incantesimi, mostri e regole di D&D 2014 e 2024 in italiano, gratis.";
const URL = "https://ilgrimorio.app/?da=amico";

/** /api/analytics as on ilgrimorio.app: counting on; the events and the votes sent are kept here. */
async function statistics(context, { consent = "accepted" } = {}) {
  const state = { consent, events: [] };
  await context.route("**/api/analytics", async route => {
    const request = route.request();
    if (request.method() === "GET") return route.fulfill({ json: { enabled: true, excluded: false, consent: state.consent } });
    const body = JSON.parse(request.postData() || "{}");
    if (body.consent) {
      state.consent = body.consent;
      return route.fulfill({ json: { ok: true, consent: body.consent } });
    }
    state.events.push(body);
    return route.fulfill({ json: { ok: true, stored: true } });
  });
  return state;
}
const named = (state, name) => state.events.filter(event => event.event === name);

/**
 * A browser: the edition chosen, the invite to install closed (unless invite), `days` earlier days of visit,
 * and the share menu of the phone (share: "send", "cancel" or null for none, as on most computers).
 */
async function visitor(browser, { days = 2, invite = false, share = "send", width = 390, consent = "accepted", paused = false } = {}) {
  const phone = width === 390;
  const context = await browser.newContext({
    ...(phone ? devices["iPhone 13"] : { viewport: { width, height: 900 } }),
    baseURL: test.info().project.use.baseURL,
  });
  await context.addInitScript(({ days, invite, share, paused }) => {
    try {
      localStorage.setItem("grimorio.edizione", "2024");
      if (!invite) localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5));
      if (!sessionStorage.getItem("e2e-days")) {
        localStorage.setItem("grimorio.giorni-di-visita", JSON.stringify(["2026-01-01", "2026-01-02"].slice(0, days)));
        sessionStorage.setItem("e2e-days", "1");
      }
      if (paused) localStorage.setItem("grimorio.valutazione-fino-al", String(Date.now() + 864e5));
    } catch { /* no storage */ }
    window.__shared = [];
    window.__copied = [];
    if (share) {
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: async data => {
          window.__shared.push(data);
          if (share === "cancel") throw new DOMException("Annullato", "AbortError");
        },
      });
    } else {
      Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    }
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async text => { window.__copied.push(text); } } });
  }, { days, invite, share, paused });
  const state = await statistics(context, { consent });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  return { context, page, state, errors };
}

const card = page => page.getByRole("button", { name: "Condividi il Grimorio" });
const question = page => page.getByRole("region", { name: "Come ti trovi con il Grimorio?" });

test("the share card: always in the Home flow, one button; the share menu with ?da=amico, the copy with «Link copiato», a cancel without errors", async ({ browser }) => {
  // 1st visit: the card is there, the question is not.
  const { context, page, state, errors } = await visitor(browser, { days: 0 });
  await page.goto("/");
  await expect(card(page)).toBeVisible();
  await expect(question(page)).toHaveCount(0);
  // In the page flow, between the picture and «Info e note legali», never fixed on the screen.
  const box = await card(page).boundingBox(), info = await page.getByRole("link", { name: "Info e note legali" }).boundingBox();
  const picture = await page.locator("#home-quote").locator("xpath=ancestor::section[1]").boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(picture.y + picture.height);
  expect(box.y + box.height).toBeLessThanOrEqual(info.y);
  expect(await card(page).evaluate(node => { for (let el = node; el; el = el.parentElement) if (["fixed", "sticky"].includes(getComputedStyle(el).position)) return true; return false; })).toBe(false);
  await expect(card(page).locator("button, a")).toHaveCount(0);
  await expect(card(page).locator('img[src="/icon-192.png"]')).toHaveAttribute("alt", "");
  await expect(card(page).locator("img")).toHaveCSS("width", "56px");
  await expect(card(page)).toHaveCSS("background-color", "rgb(255, 251, 240)");
  await expect(card(page)).toHaveCSS("border-radius", "18px");
  await expect(card(page)).toContainText("Porta il Grimorio al tavolo");
  await expect(card(page)).toContainText("Mandalo al tuo gruppo, è gratis");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/4-condividi-390.png` });

  await card(page).click();
  await expect.poll(() => page.evaluate(() => window.__shared)).toEqual([{ title: "Il Grimorio.App", text: TEXT, url: URL }]);
  await expect.poll(() => named(state, "share_sent").length).toBe(1);
  expect(named(state, "share_tap").map(event => [event.from, event.device, event.path])).toEqual([["home", "iphone", "/"]]);
  expect(named(state, "share_sent")[0].from).toBe("home");
  await expect(page.locator("[data-share-card]:visible [role=status]")).toHaveText("");
  await context.close();

  // Without the share menu (a computer): the message and the link copied, «Link copiato» for 2 seconds.
  const desk = await visitor(browser, { days: 0, share: null });
  await desk.page.goto("/");
  await card(desk.page).click();
  await expect(desk.page.getByText("Link copiato")).toBeVisible();
  expect(await desk.page.evaluate(() => window.__copied)).toEqual([`${TEXT} ${URL}`]);
  await expect.poll(() => named(desk.state, "share_sent").length).toBe(1);
  await expect(desk.page.getByText("Link copiato")).toBeHidden({ timeout: 4000 });
  await desk.context.close();

  // The menu closed: no error, no message, share_cancel.
  const cancel = await visitor(browser, { days: 0, share: "cancel" });
  await cancel.page.goto("/");
  await card(cancel.page).click();
  await expect.poll(() => named(cancel.state, "share_cancel").length).toBe(1);
  expect(named(cancel.state, "share_sent")).toEqual([]);
  await expect(cancel.page.locator("[data-share-card]:visible [role=status]")).toHaveText("");
  expect([...errors, ...cancel.errors]).toEqual([]);
  await cancel.context.close();
});

test("a friend's link: arrivo_da_amico once, the address cleaned; after «No» nothing sent, the address cleaned all the same", async ({ browser }) => {
  const { context, page, state } = await visitor(browser, { days: 0 });
  await page.goto("/?da=amico");
  await expect.poll(() => named(state, "arrivo_da_amico").length).toBe(1);
  await expect(page).toHaveURL(/\/$/);
  expect(named(state, "arrivo_da_amico")[0].device).toBe("iphone");
  // A move inside the site does not count it again.
  await page.getByRole("link", { name: "Info e note legali" }).click();
  await expect(page).toHaveURL(/\/info$/);
  expect(named(state, "arrivo_da_amico").length).toBe(1);
  await context.close();

  const no = await visitor(browser, { days: 0, consent: "rejected" });
  await no.page.goto("/?da=amico");
  await expect(no.page).toHaveURL(/\/$/);
  await no.page.waitForTimeout(500);
  expect(no.state.events).toEqual([]);
  await no.context.close();
});

test("the question: not at the 1st and 2nd visit, from the 3rd; never with the statistics bar or the invite; never after «No»", async ({ browser }) => {
  for (const days of [0, 1]) {
    const { context, page } = await visitor(browser, { days });
    await page.goto("/");
    await expect(card(page)).toBeVisible();
    await page.waitForTimeout(600);
    await expect(question(page), `visit ${days + 1}`).toHaveCount(0);
    await context.close();
  }
  // 3rd day: the question above the share card.
  const third = await visitor(browser, { days: 2 });
  await third.page.goto("/");
  await expect(question(third.page)).toBeVisible();
  const q = await question(third.page).boundingBox(), c = await card(third.page).boundingBox();
  expect(q.y + q.height).toBeLessThanOrEqual(c.y);
  for (const name of ["Male", "Così così", "Bene"]) {
    const face = question(third.page).getByRole("button", { name, exact: true });
    expect((await face.boundingBox()).height).toBeGreaterThanOrEqual(64);
    await expect(face.locator("svg")).toHaveCount(1);
  }
  expect((await question(third.page).getByRole("button", { name: "Chiudi" }).boundingBox()).width).toBeGreaterThanOrEqual(44);
  await expect(question(third.page)).toHaveCSS("background-color", "rgb(255, 251, 240)");
  if (SHOTS) await third.page.screenshot({ path: `${SHOTS}/1-domanda-390.png` });
  await third.context.close();

  // The statistics bar first: the question waits for «Ok».
  const bar = await visitor(browser, { days: 2, consent: null });
  await bar.page.goto("/");
  await expect(bar.page.locator("[data-statistics-bar]")).toBeVisible();
  await bar.page.waitForTimeout(600);
  await expect(question(bar.page)).toHaveCount(0);
  await bar.page.locator("[data-statistics-bar]").getByRole("button", { name: "Ok" }).click();
  await expect(question(bar.page)).toBeVisible();
  await bar.context.close();

  // The invite to install first: the question waits until it is closed; then the invite does not come back over it.
  const invite = await visitor(browser, { days: 2, invite: true });
  await invite.page.goto("/");
  await expect(invite.page.locator("[data-install-prompt]")).toBeVisible();
  await expect(question(invite.page)).toHaveCount(0);
  await invite.page.locator("[data-install-prompt]").getByRole("button", { name: "Chiudi" }).click();
  await expect(question(invite.page)).toBeVisible();
  await expect(invite.page.locator("[data-install-prompt]")).toHaveCount(0);
  await invite.context.close();

  // «No» to the statistics: no question, nothing sent.
  const no = await visitor(browser, { days: 2, consent: "rejected" });
  await no.page.goto("/");
  await expect(card(no.page)).toBeVisible();
  await no.page.waitForTimeout(800);
  await expect(question(no.page)).toHaveCount(0);
  expect(no.state.events).toEqual([]);
  await no.context.close();
});

test("after the vote: «Male» → «Vuoi dirci di più?» → Segnala with «Consiglio»; «Bene» → «Fallo conoscere» → Condividi; × → not again", async ({ browser }) => {
  test.setTimeout(120_000);
  const low = await visitor(browser, { days: 2 });
  await low.page.goto("/");
  await question(low.page).getByRole("button", { name: "Male", exact: true }).click();
  await expect.poll(() => named(low.state, "valutazione").map(event => [event.vote, event.device])).toEqual([["male", "iphone"]]);
  const thanks = low.page.getByRole("region", { name: "Grazie! Vuoi dirci di più?" });
  await expect(thanks).toBeVisible();
  await expect(thanks).toContainText("Un consiglio, un errore, una sezione che ti manca: lo leggiamo tutto.");
  await expect(thanks).toHaveCSS("background-color", "rgb(230, 240, 234)");
  if (SHOTS) await low.page.screenshot({ path: `${SHOTS}/2-grazie-390.png` });
  await thanks.getByRole("link", { name: "Scrivici" }).click();
  await expect(low.page).toHaveURL(/\/segnala\?tipo=consiglio&valutazione=male$/);
  await expect(low.page.getByRole("button", { name: "Consiglio", exact: true })).toHaveAttribute("aria-pressed", "true");
  // Sent to the local test database only: the report keeps the inner label, the visitor never sees it.
  await expect(low.page.getByText("dalla valutazione")).toHaveCount(0);
  await low.page.getByLabel("Messaggio").fill("Mi piacerebbe una sezione con i talenti.");
  await low.page.getByRole("button", { name: "Invia segnalazione" }).click();
  await expect(low.page.getByRole("heading", { name: "Grazie!" })).toBeVisible({ timeout: 15_000 });
  // Back on the Home: the question is paused for 4 months.
  await low.page.goto("/");
  await expect(card(low.page)).toBeVisible();
  await low.page.waitForTimeout(600);
  await expect(low.page.locator("[data-rating]")).toHaveCount(0);
  await low.context.close();

  const high = await visitor(browser, { days: 2 });
  await high.page.goto("/");
  await question(high.page).getByRole("button", { name: "Bene", exact: true }).click();
  const share = high.page.getByRole("region", { name: "Grazie! Ti piace? Fallo conoscere" });
  await expect(share).toContainText("Mandalo al tuo gruppo: giocatori e master lo usano gratis, anche al tavolo.");
  await expect(share.getByRole("link", { name: "Scrivici" })).toHaveAttribute("href", "/segnala?tipo=consiglio&valutazione=bene");
  if (SHOTS) await high.page.screenshot({ path: `${SHOTS}/5-grazie-bene-390.png` });
  await share.getByRole("button", { name: "Condividi" }).click();
  await expect.poll(() => high.page.evaluate(() => window.__shared)).toEqual([{ title: "Il Grimorio.App", text: TEXT, url: URL }]);
  await expect.poll(() => named(high.state, "share_sent").map(event => event.from)).toEqual(["valutazione"]);
  expect(named(high.state, "share_tap").map(event => event.from)).toEqual(["valutazione"]);
  expect(high.errors).toEqual([]);
  await high.context.close();

  const closed = await visitor(browser, { days: 2 });
  await closed.page.goto("/");
  await question(closed.page).getByRole("button", { name: "Chiudi" }).click();
  await expect(question(closed.page)).toHaveCount(0);
  expect(named(closed.state, "valutazione")).toEqual([]);
  await closed.page.reload();
  await expect(card(closed.page)).toBeVisible();
  await closed.page.waitForTimeout(600);
  await expect(question(closed.page)).toHaveCount(0);
  expect(await closed.page.evaluate(() => Number(localStorage.getItem("grimorio.valutazione-fino-al")) - Date.now())).toBeGreaterThan(119 * 864e5);
  await closed.context.close();
});

test("computer: the card and the question under the shortcuts of the Home, in the page flow", async ({ browser }) => {
  const { context, page } = await visitor(browser, { days: 2, width: 1280, share: null });
  await page.goto("/");
  await expect(card(page)).toBeVisible();
  await expect(question(page)).toBeVisible();
  const shortcuts = await page.getByRole("navigation", { name: "Scorciatoie" }).boundingBox();
  expect((await question(page).boundingBox()).y).toBeGreaterThan(shortcuts.y + shortcuts.height);
  expect((await card(page).boundingBox()).width).toBeLessThanOrEqual(440);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/1-domanda-1280.png` });
  await question(page).getByRole("button", { name: "Così così", exact: true }).click();
  await expect(page.getByRole("region", { name: "Grazie! Vuoi dirci di più?" })).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/2-grazie-1280.png` });
  await context.close();
  const bene = await visitor(browser, { days: 2, width: 1280, share: null });
  await bene.page.goto("/");
  await question(bene.page).getByRole("button", { name: "Bene", exact: true }).click();
  await expect(bene.page.getByRole("region", { name: "Grazie! Ti piace? Fallo conoscere" })).toBeVisible();
  if (SHOTS) await bene.page.screenshot({ path: `${SHOTS}/5-grazie-bene-1280.png` });
  await bene.context.close();
  const plain = await visitor(browser, { days: 0, width: 1280, share: null });
  await plain.page.goto("/");
  await expect(card(plain.page)).toBeVisible();
  if (SHOTS) await plain.page.screenshot({ path: `${SHOTS}/4-condividi-1280.png` });
  await plain.context.close();
});

async function login(page) {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
}

test("«Come si trovano?»: the number below 5 answers, the percentages from 5, the weeks, the comments, «Passaparola»; administrator only", async ({ page, browser }) => {
  test.setTimeout(120_000);
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    if (width === 390) await login(page);
    await page.goto("/admin/statistiche");
    await page.getByRole("link", { name: /Come si trovano\?/ }).click();
    await expect(page).toHaveURL(/\/admin\/statistiche\/valutazione$/);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const db = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await db.connect();
  try {
    await db.query("DELETE FROM grimorio_ratings");
    const vote = (voto, days = 0) => db.query("INSERT INTO grimorio_ratings (id, voto, device, creato_il) VALUES ($1, $2, 'iphone', now() - make_interval(days => $3))", [randomUUID(), voto, days]);
    for (const voto of ["bene", "bene", "male"]) await vote(voto);
    await page.goto("/admin/statistiche/valutazione");
    await expect(page.getByRole("heading", { level: 1, name: "Come si trovano?" })).toBeVisible();
    await expect(page.locator("[data-ratings]")).toHaveAttribute("data-ratings", "3");
    await expect(page.locator("[data-threshold]")).toHaveText("Servono almeno 5 risposte per le percentuali.");
    await expect(page.locator("[data-bene-percent]")).toHaveCount(0);
    for (const voto of ["bene", "cosi-cosi"]) await vote(voto);
    await vote("male", 20);
    await page.goto("/admin/statistiche/valutazione?periodo=7");
    await expect(page.getByRole("link", { name: "7 giorni" })).toHaveAttribute("aria-current", "page");
    await expect(page.locator("[data-bene-percent]")).toHaveText("60%");
    await expect(page.locator('[data-vote-row="Così così"]')).toContainText("20%");
    await expect(page.locator('[data-vote-row="Male"]')).toContainText("20%");
    await page.goto("/admin/statistiche/valutazione?periodo=sempre");
    await expect(page.locator("[data-ratings]")).toHaveAttribute("data-ratings", "6");
    await expect(page.locator("[data-bene-percent]")).toHaveText("50%");
    await expect(page.locator('svg[data-chart="settimane"]').first()).toHaveAttribute("aria-label", /^Percentuale «Bene» per settimana: settimana del .*/);

    // «Passaparola»: people, not taps.
    const events = [["p1", "share_tap", "home"], ["p1", "share_tap", "home"], ["p1", "share_sent", "home"], ["p2", "share_tap", "valutazione"], ["p3", "arrivo_da_amico", null], ["p4", "arrivo_da_amico", null]];
    for (const [who, name, from] of events)
      await db.query(`INSERT INTO grimorio_analytics_events (id, visitor_id, session_id, view_id, event_name, path, source, share_from, device)
        VALUES ($1, $2, $3, $4, $5, '/', 'direct', $6, 'iphone')`, [randomUUID(), `prova-passaparola-${who}`, randomUUID(), randomUUID(), name, from]);
    await page.goto("/admin/statistiche/valutazione");
    const word = page.locator("[data-word-of-mouth]");
    await expect(word.locator("[data-tapped]")).toHaveText("2");
    await expect(word.locator("[data-tapped-from]")).toHaveText("1 · 1");
    await expect(word.locator("[data-sent]")).toHaveText("1");
    await expect(word.locator("[data-arrived]")).toHaveText("2");
    await expect(word.locator('svg[data-chart="settimane"]')).toHaveAttribute("aria-label", /settimana del .*: 2\.$/);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/3-admin-390.png`, fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/3-admin-1280.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });

    // The comments written after the faces: the label in the reserved list, the filter from the link.
    await db.query(`INSERT INTO grimorio_feedback_reports (id, tipo, messaggio, etichetta) VALUES ($1, 'consiglio', 'Un commento di prova dalla Home.', 'dalla valutazione: così così')`, [randomUUID()]);
    await page.goto("/admin/statistiche/valutazione");
    const comments = page.getByRole("link", { name: /Commenti arrivati con «Scrivici»/ });
    await expect(comments).not.toHaveAttribute("data-rating-comments", "0");
    await comments.click();
    await expect(page).toHaveURL(/\/admin\/segnalazioni\?etichetta=valutazione$/);
    await expect(page.locator("[data-etichetta]").filter({ hasText: "dalla valutazione: così così" })).toHaveCount(1);
    await expect(page.locator("[data-etichetta]").first()).toBeVisible();

    // Others: the passcode request, never the numbers.
    const guest = await browser.newContext({ baseURL: test.info().project.use.baseURL });
    const other = await guest.newPage();
    await other.goto("/admin/statistiche/valutazione");
    await expect(other.getByLabel("Passcode")).toBeVisible();
    await expect(other.locator("[data-ratings]")).toHaveCount(0);
    await guest.close();
  } finally {
    await db.query("DELETE FROM grimorio_ratings");
    await db.query("DELETE FROM grimorio_analytics_events WHERE visitor_id LIKE 'prova-passaparola-%'");
    await db.query("DELETE FROM grimorio_feedback_reports WHERE etichetta LIKE 'dalla valutazione%'");
    await db.end();
  }
});
