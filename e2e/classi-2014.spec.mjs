import { test, expect } from "@playwright/test";
import pg from "pg";
import { TEST_DATABASE_URL } from "./test-db.mjs";

// «Classi incantesimi 2014» in /admin: never for visitors (not in the page nor its HTML), hidden when there is
// nothing to do, preview before → after, «Applica» once, then gone; the card shows its classes.
// Local test database only: the rows made here are deleted at the end.
const ROWS = [["amicizia-2", "Amicizia", "Trucchetto di Ammaliamento"], ["telepatia-2", "Telepatia", "Invocazione di 8° livello"], ["parola-del-poter-guarire", "Parola del poter Guarire", "Invocazione di 9° livello"]];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ } });
});

async function login(page) {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByRole("link", { name: "Sezioni dell’app" })).toBeVisible();
}

test("classi incantesimi 2014: admin only, preview, apply once, then gone", async ({ page, request }) => {
  test.setTimeout(180_000);
  const db = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await db.connect();
  try {
    // Visitor: the login, never the box.
    const html = await (await request.get("/admin")).text();
    expect(html).not.toContain("Classi incantesimi 2014");
    // Administrator, none of the spells in the database: nothing to do, no box.
    await login(page);
    await expect(page.locator("[data-spell-classes-2014]")).toHaveCount(0);

    for (const [id, nome, livello] of ROWS) await db.query("INSERT INTO spells (id, nome_italiano, livello, descrizione, sort_key) VALUES ($1, $2, $3, 'Testo di prova.', lower($2))", [id, nome, livello]);
    await page.reload();
    const box = page.locator("[data-spell-classes-2014]");
    await expect(box.getByRole("heading", { name: "Classi incantesimi 2014" })).toBeVisible();
    await expect(box.locator("[data-classes-change]")).toHaveCount(3);
    await expect(box.locator('[data-classes-change="amicizia-2"]')).toContainText("«Trucchetto di Ammaliamento» → «Trucchetto di Ammaliamento (bardo, mago, stregone, warlock)»");
    await expect(box.locator("[data-classes-rename]")).toContainText("«Parola del poter Guarire» → «Parola del potere guarire»");
    await expect(box.getByText("Saltati: 31")).toBeVisible();
    // Nothing written by the preview.
    expect((await db.query("SELECT livello FROM spells WHERE id = 'telepatia-2'")).rows[0].livello).toBe("Invocazione di 8° livello");

    await box.getByRole("button", { name: "Applica" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Fatto" })).toHaveText("Fatto: 3 livelli modificati, 1 nome corretto, 31 saltati.");
    const rows = (await db.query("SELECT id, nome_italiano, livello FROM spells WHERE id = ANY($1) ORDER BY id", [ROWS.map(row => row[0])])).rows;
    expect(rows).toEqual([
      { id: "amicizia-2", nome_italiano: "Amicizia", livello: "Trucchetto di Ammaliamento (bardo, mago, stregone, warlock)" },
      { id: "parola-del-poter-guarire", nome_italiano: "Parola del potere guarire", livello: "Invocazione di 9° livello (bardo)" },
      { id: "telepatia-2", nome_italiano: "Telepatia", livello: "Invocazione di 8° livello (mago)" },
    ]);
    // Done: the box is gone; the Registro has the values before.
    await page.reload();
    await expect(page.getByRole("link", { name: "Sezioni dell’app" })).toBeVisible();
    await expect(page.locator("[data-spell-classes-2014]")).toHaveCount(0);
    expect((await db.query("SELECT count(*)::int AS n FROM grimorio_editor_log WHERE scheda_id = ANY($1)", [ROWS.map(row => row[0])])).rows[0].n).toBe(4);
    // The card shows its classes.
    await page.goto("/spell/telepatia-2");
    await expect(page.locator("main").getByText("Mago", { exact: true })).toBeVisible();
  } finally {
    await db.query("DELETE FROM grimorio_editor_log WHERE scheda_id = ANY($1)", [ROWS.map(row => row[0])]).catch(() => undefined);
    await db.query("DELETE FROM spells WHERE id = ANY($1)", [ROWS.map(row => row[0])]);
    await db.end();
  }
});
