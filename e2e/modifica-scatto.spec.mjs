import { test, expect } from "./fixtures.mjs";
import { mkdirSync, writeFileSync } from "node:fs";

// «Modifica» from a public page, on an iPhone-sized touch screen with a slow processor: the editor shows
// at once, never the list of the admin area first; the focus goes to its title without the ring.
// Frames of the screen every 100 ms (MODIFICA_FRAMES=<folder> keeps them). Local test database only.
const FRAMES = process.env.MODIFICA_FRAMES;
// What only the lists of the admin area draw: search, «Tutte · Visibili · Nascoste», the rows.
const LIST = '[data-admin-list], li[data-card-row], [data-card-switch]';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5));
      if (!window.localStorage.getItem("grimorio.edizione")) window.localStorage.setItem("grimorio.edizione", "2024");
    } catch { /* no storage */ }
  });
});

async function login(page) {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
}

/** Every document of the tab reports a list of the admin area as soon as the parser puts one in the page. */
async function watchLists(page) {
  const seen = [];
  await page.exposeBinding("grimorioSawList", (_source, where) => seen.push(where));
  await page.addInitScript(selector => {
    const check = () => {
      if (document.querySelector(selector)) { window.grimorioSawList?.(location.pathname + location.search); observer.disconnect(); }
    };
    const observer = new MutationObserver(check);
    observer.observe(document, { childList: true, subtree: true });
  }, LIST);
  return seen;
}

/** The screen as it is painted, from the tap until the editor has been on screen for a moment. */
async function filmed(page, name, tap, ready) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    frames.push({ at: metadata.timestamp * 1000, data });
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  // An iPhone is slower than this computer: the page takes longer to start, as it would there.
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 60, everyNthFrame: 1 });
  const start = Date.now();
  await tap();
  await ready();
  await page.waitForTimeout(800);
  await cdp.send("Page.stopScreencast");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await cdp.detach();
  if (FRAMES && frames.length) {
    const folder = `${FRAMES}/${name}`;
    mkdirSync(folder, { recursive: true });
    // One frame every 100 ms: the last one painted before each step.
    const first = Math.min(start, frames[0].at);
    for (let tick = 0, index = 0; first + tick * 100 <= frames.at(-1).at + 100; tick++) {
      while (index + 1 < frames.length && frames[index + 1].at <= first + tick * 100) index++;
      writeFileSync(`${folder}/${String(tick * 100).padStart(5, "0")}ms.jpg`, Buffer.from(frames[index].data, "base64"));
    }
  }
  return frames.length;
}

test("«Modifica» from the public pages: the editor at once, never the list, focus on the title without the ring", async ({ page }) => {
  test.setTimeout(300_000);
  await login(page);
  // «Amicizia» 2014, a spell added by the administrator (as in production), to remove at the end.
  await page.goto("/admin/edizione?valore=2014&poi=%2Fadmin%2Fincantesimi");
  await page.getByRole("button", { name: "Nuovo", exact: true }).click();
  let editor = page.getByRole("dialog");
  await editor.getByLabel("Nome *").fill("Amicizia");
  await editor.locator("#spell-level").selectOption("0");
  await editor.locator("#spell-school").selectOption({ index: 2 });
  await editor.getByRole("button", { name: "Crea nel catalogo" }).click();
  await expect(editor).toHaveCount(0);
  await page.getByPlaceholder("Cerca per nome o scuola…").fill("amicizia");
  const amicizia = await page.locator("main ul li[data-card-row]").filter({ hasText: /Amicizia(?! con)/ }).first().getAttribute("data-public-href");
  await page.goto("/admin/edizione?valore=2024&poi=%2Fadmin");

  const seen = await watchLists(page);
  const button = () => page.locator("[data-admin-edit]").first();
  const pencil = name => () => page.getByRole("link", { name, exact: true });
  for (const [name, path, control, title] of [
    ["amicizia-2014", amicizia, button, "Modifica incantesimo"],
    ["palla-di-fuoco-2024", "/spell/palla-di-fuoco", button, "Modifica incantesimo"],
    ["orco-2014", "/mostro/orco-2014", button, "Modifica mostro"],
    ["ascia", "/equipaggiamento/armi", pencil("Modifica Ascia"), "Ascia"],
    ["accecato", "/compendio/condizioni", pencil("Modifica Accecato"), "Accecato"],
  ]) {
    await page.goto(path);
    await expect(control()).toBeVisible();
    const heading = page.getByRole("heading", { name: title }).first();
    const count = await filmed(page, name, () => control().tap(), () => expect(heading).toBeVisible({ timeout: 30_000 }));
    expect(count, `${name}: frames`).toBeGreaterThan(0);
    expect(seen, `${name}: a list of the admin area was on screen`).toEqual([]);
    await expect(page.locator(LIST), name).toHaveCount(0);
    // Spells and creatures: the editor is the page, with the way back; the focus on its title, no ring on the eye.
    if (title.startsWith("Modifica")) {
      await expect(page).toHaveURL(/\/admin\/(incantesimi|mostri)\/[^/?]+\?(impostata=1&)?ritorno=/);
      await expect(page.getByRole("link", { name: "‹ Torna alla scheda" })).toHaveAttribute("href", path);
      await expect(page.getByTestId("admin-edition-band")).toHaveText(/^(2014|2024)$/);
      await expect.poll(() => page.evaluate(() => document.activeElement?.textContent)).toBe(title);
      expect(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle)).toBe("none");
      const eye = page.locator("[data-card-eye]");
      await expect(eye).not.toBeFocused();
      // The keyboard: Tab goes on to the eye, with the ring.
      await page.keyboard.press("Tab");
      await expect(eye).toBeFocused();
      expect(await eye.evaluate(node => node.matches(":focus-visible") && getComputedStyle(node).outlineStyle !== "none")).toBe(true);
    }
  }

  // From the list: a tap on the name opens the editor, the focus on its title, no ring on the eye; «Chiudi» goes back to the list.
  await page.goto("/admin/incantesimi");
  await page.getByPlaceholder("Cerca per nome o scuola…").fill("palla di fuoco");
  await page.locator("main ul li[data-card-row]").filter({ hasText: /palla di fuoco/i }).first().getByRole("link").first().tap();
  editor = page.getByRole("dialog");
  await expect(editor.getByRole("heading", { name: "Modifica incantesimo" })).toBeFocused();
  await expect(editor.locator("[data-card-eye]")).not.toBeFocused();
  await editor.getByRole("button", { name: "Chiudi editor" }).tap();
  await expect(page).toHaveURL(/\/admin\/incantesimi$/);
  await expect(page.getByPlaceholder("Cerca per nome o scuola…")).toBeVisible();

  // Clean up: «Amicizia» 2014.
  await page.goto("/admin/edizione?valore=2014&poi=%2Fadmin%2Fincantesimi");
  await page.getByPlaceholder("Cerca per nome o scuola…").fill("amicizia");
  page.once("dialog", dialog => dialog.accept());
  await page.locator("main ul li[data-card-row]").filter({ hasText: /Amicizia(?! con)/ }).first().dispatchEvent("contextmenu");
  await page.locator("[data-row-menu]").getByRole("button", { name: "Elimina" }).click();
  await expect(page.locator("main ul li[data-card-row]").filter({ hasText: /Amicizia(?! con)/ })).toHaveCount(0);
  await page.goto("/admin/edizione?valore=2024&poi=%2Fadmin");
});
