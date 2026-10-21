import { spawn } from "node:child_process";
import { test, expect } from "@playwright/test";

const banner = page => page.getByRole("status").filter({ hasText: "Sei offline" });

// A dedicated server that the test really switches off: the browser's offline
// emulation does not reach service workers, a stopped server does.
const port = 3200;
const base = `http://127.0.0.1:${port}`;
let server;
async function startServer() {
  server = spawn("npx", ["next", "start", "-p", String(port), "-H", "127.0.0.1"], { stdio: "ignore", env: process.env, detached: true });
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(base + "/")).ok) return; } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error("server did not start");
}
// A hard stop that waits for the process to end: a gentle stop lets the server answer, for
// a moment, on the connection the browser keeps open, and the page then comes from the
// network instead of the saved copy (intermittent failures on 20 October 2026).
async function stopServer() {
  if (!server) return;
  const stopping = server;
  server = undefined;
  const exited = new Promise(resolve => stopping.once("exit", resolve));
  try { process.kill(-stopping.pid, "SIGKILL"); } catch { /* already stopped */ }
  if (stopping.exitCode === null && stopping.signalCode === null) await exited;
}
test.afterEach(stopServer);

test("offline: visited pages open from the saved copy with a notice, others say offline", async ({ page }) => {
  test.setTimeout(120_000);
  await startServer();
  await page.goto(base + "/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  // Visited with the connection: saved for later.
  await page.goto(base + "/spell/dardo-incantato");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Dardo Incantato/i);
  await expect(banner(page)).toHaveCount(0);
  await page.goto(base + "/equipaggiamento/armi/tridente");
  await expect(page.locator('[data-edition="2024"]')).toContainText("1d8");
  await page.goto(base + "/equipaggiamento/avventura/munizioni");
  await expect(page.getByRole("heading", { level: 1 }).first()).toHaveText("Munizioni");
  await page.goto(base + "/equipaggiamento/avventura/canestro");
  await expect(page.locator('[data-edition="2014"]').getByRole("heading", { level: 1 })).toHaveText("Canestro");
  await page.goto(base + "/avanzamento");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Avanzamento di livello");
  await page.goto(base + "/oggetti-magici");
  await expect(page.locator('main a[href^="/oggetti-magici/"]')).toHaveCount(258);
  await page.goto(base + "/oggetti-magici/bacchetta-delle-meraviglie");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bacchetta delle meraviglie");

  await stopServer();
  await expect.poll(async () => { try { await fetch(base + "/"); return "up"; } catch { return "down"; } }).toBe("down");
  await page.goto(base + "/spell/dardo-incantato");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Dardo Incantato/i);
  // The saved copy carries its date, so the notice does not depend on the worker's memory.
  await expect(page.locator('meta[name="grimorio-saved-at"]')).toHaveCount(1);
  await expect(banner(page)).toBeVisible();
  // A weapon sheet: both editions are in the saved copy.
  await page.goto(base + "/equipaggiamento/armi/tridente");
  await expect(banner(page)).toBeVisible();
  await page.getByRole("group", { name: "Edizione delle regole" }).getByRole("button", { name: "2014" }).click();
  await expect(page.locator('[data-edition="2014"]')).toBeVisible();
  await expect(page.locator('[data-edition="2014"]')).toContainText("1d6");
  await page.reload();
  await expect(page.locator('[data-edition="2014"]')).toContainText("1d6");
  // A 2014 adventuring gear sheet with its own address, after a reload.
  await page.goto(base + "/equipaggiamento/avventura/canestro");
  await page.reload();
  await expect(page.locator('[data-edition="2014"]').getByRole("heading", { level: 1 })).toHaveText("Canestro");
  // An adventuring gear sheet, with its table, after a reload.
  await page.goto(base + "/equipaggiamento/avventura/munizioni");
  await page.reload();
  // The edition chosen on the weapon sheet (2014) is the one shown.
  await expect(page.locator("p:visible", { hasText: /^Proiettili/ }).first()).toBeVisible();
  // The main sections were saved when the service worker was installed, the Compendio too.
  await page.goto(base + "/bestiario");
  await expect(page.locator("li.catalog-row")).toHaveCount(40);
  await page.goto(base + "/avanzamento");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Avanzamento di livello");
  await page.getByRole("button", { name: "Aggiungi riga" }).click();
  await expect(page.getByLabel("Riga 2: grado sfida")).toBeVisible();
  // Magic items: the list and a sheet with its table, after a reload.
  await page.goto(base + "/oggetti-magici");
  await page.reload();
  await expect(page.locator('main a[href^="/oggetti-magici/"]')).toHaveCount(258);
  await page.goto(base + "/oggetti-magici/bacchetta-delle-meraviglie");
  await page.reload();
  await expect(page.locator("[data-table-rows]")).toHaveAttribute("data-table-rows", "18");
  await page.goto(base + "/compendio");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Compendio");
  await expect(page.getByRole("link", { name: /Equipaggiamento/ })).toBeVisible();
  // The notice never covers the controls at the top: on a phone the edition selector stays tappable.
  for (const width of [390, 375]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(base + "/grimorio");
    await expect(banner(page)).toBeVisible();
    for (const edition of ["2014", "2024"]) {
      const button = page.getByRole("button", { name: edition, exact: true });
      await button.click({ timeout: 5000 });
      await expect(button).toHaveAttribute("aria-pressed", "true");
    }
    const notice = await banner(page).boundingBox(), selector = await page.getByRole("button", { name: "2014", exact: true }).boundingBox();
    expect(notice.y + notice.height).toBeLessThanOrEqual(selector.y);
  }
  // Never opened: a clear offline page instead of the browser error.
  await page.goto(base + "/spell/aiuto");
  await expect(page.getByText("Questa pagina non è ancora salvata sul telefono.")).toBeVisible();
  // The admin area is never served from the phone.
  const adminFailed = await page.goto(base + "/admin").then(() => false, () => true);
  expect(adminFailed).toBe(true);
  // Let the browser finish showing its own error page, then leave it: Chrome reloads
  // its error page by itself when the server comes back, which would interrupt the next visit.
  await expect.poll(() => page.url()).toMatch(/^chrome-error:/);
  await page.goto("about:blank");

  // Back online: fresh page, no notice.
  await startServer();
  await page.goto(base + "/spell/dardo-incantato");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Dardo Incantato/i);
  await expect(banner(page)).toHaveCount(0);
});

test("service worker script: no-cache headers and a version per build", async ({ request }) => {
  const response = await request.get("/sw.js");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-cache, no-store, must-revalidate");
  expect(response.headers()["content-type"]).toContain("javascript");
  expect(await response.text()).toMatch(/^const VERSION = "/);
});
