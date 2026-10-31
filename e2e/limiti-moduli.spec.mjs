import { test, expect } from "@playwright/test";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";

// Without Turnstile (28 October 2026): over the hourly ceiling of the whole site a report is saved all the same,
// without email nor push, and marked in the reserved area; one address over its own limit is refused as before.
// Local test database only.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem("grimorio.edizione", "2024"); localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
});

test("a report during a peak: saved, «ok» for the visitor, marked «arrivata durante un picco» without the email warning", async ({ page }) => {
  test.setTimeout(120_000);
  const db = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await db.connect();
  const message = "Segnalazione di prova durante un picco.";
  try {
    await page.goto("/segnala");
    await expect(page.getByRole("heading", { name: "Segnala" })).toBeVisible();
    // 60 reports from other addresses in the last hour: the ceiling of the site. The table as lib/feedback.ts makes it
    // at the first report: this test may run before any other report of the run (the order of the CI shards).
    await db.query("CREATE TABLE IF NOT EXISTS grimorio_feedback_limits (device_hash text NOT NULL, sent_at timestamptz NOT NULL DEFAULT now())");
    await db.query("DELETE FROM grimorio_feedback_limits");
    await db.query("INSERT INTO grimorio_feedback_limits (device_hash) SELECT 'altro-' || n FROM generate_series(1, 60) AS n");
    await page.getByLabel("Messaggio").fill(message);
    await page.getByRole("button", { name: "Invia segnalazione" }).click();
    await expect(page.getByRole("heading", { name: "Grazie!" })).toBeVisible({ timeout: 15_000 });
    const { rows } = await db.query("SELECT picco, email_inviata, email_esito FROM grimorio_feedback_reports WHERE messaggio = $1", [message]);
    expect(rows).toEqual([{ picco: true, email_inviata: false, email_esito: "Non inviata: arrivata durante un picco di segnalazioni." }]);

    await page.goto("/admin");
    await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
    await page.getByRole("button", { name: "Entra" }).click();
    await expect(page.getByPlaceholder("Cerca qualsiasi scheda da modificare")).toBeVisible();
    await page.goto("/admin/segnalazioni");
    const row = page.locator("li").filter({ hasText: message });
    await expect(row.locator("[data-picco]")).toHaveText("Arrivata durante un picco (senza email né notifica)");
    await expect(row.getByText("Email di avviso non inviata")).toHaveCount(0);
  } finally {
    await db.query("DELETE FROM grimorio_feedback_limits").catch(() => {});
    await db.query("DELETE FROM grimorio_feedback_reports WHERE messaggio = $1", [message]).catch(() => {});
    await db.end();
  }
});
