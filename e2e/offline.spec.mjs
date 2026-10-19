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
function stopServer() {
  if (server) { try { process.kill(-server.pid, "SIGTERM"); } catch { /* already stopped */ } server = undefined; }
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

  stopServer();
  await expect.poll(async () => { try { await fetch(base + "/"); return "up"; } catch { return "down"; } }).toBe("down");
  await page.goto(base + "/spell/dardo-incantato");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Dardo Incantato/i);
  await expect(banner(page)).toBeVisible();
  // The main sections were saved when the service worker was installed.
  await page.goto(base + "/bestiario");
  await expect(page.locator("li.catalog-row")).toHaveCount(40);
  // Never opened: a clear offline page instead of the browser error.
  await page.goto(base + "/spell/aiuto");
  await expect(page.getByText("Questa pagina non è ancora salvata sul telefono.")).toBeVisible();
  // The admin area is never served from the phone.
  const adminFailed = await page.goto(base + "/admin").then(() => false, () => true);
  expect(adminFailed).toBe(true);
  // Let the browser finish showing its own error page before navigating again.
  await expect.poll(() => page.url()).toMatch(/^chrome-error:/);

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
