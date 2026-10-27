import { test, expect } from "@playwright/test";

// A card hidden with the eye, or a card of a hidden edition, leaks nothing to visitors: the 404 has the generic title
// and metadata of any missing page (no name, description, og:/twitter: tags or canonical). Local test database only:
// everything is shown again at the end.
const GENERIC_TITLE = "Pagina non disponibile — Il Grimorio.App";
const stateRadio = (scope, title, label) => scope.getByRole("radiogroup", { name: `Stato di ${title}`, exact: true }).getByRole("radio", { name: label, exact: true });

async function generic(request, path, name) {
  const response = await request.get(path);
  expect(response.status(), path).toBe(404);
  const html = await response.text();
  const head = html.slice(0, html.indexOf("</head>"));
  expect(head.match(/<title>([^<]*)<\/title>/)?.[1], path).toBe(GENERIC_TITLE);
  expect(head, path).not.toMatch(/rel="canonical"|property="og:url"/);
  for (const tag of head.match(/<meta[^>]+>/g) ?? []) expect(tag, path).not.toContain(name);
  // Nothing of the card anywhere in the answer (page data included).
  expect(html, path).not.toContain(name);
}

test("hidden card and hidden edition: the 404 has generic title and metadata, nothing of the card", async ({ page, request }) => {
  test.setTimeout(240_000);
  // Before: the pages show their card with its own metadata.
  for (const [path, name] of [["/mostro/aboleth", "Aboleth"], ["/spell/allarme-2014", "Allarme"]]) {
    const html = await (await request.get(path)).text();
    expect(html.match(/<title>([^<]*)<\/title>/)?.[1], path).toContain(name);
  }
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("passcode-di-prova-e2e");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByRole("heading", { name: "Amministrazione" })).toBeVisible();

  // A creature hidden with the eye.
  await page.goto("/admin/mostri");
  await page.getByRole("group", { name: "Edizione dell’area riservata" }).getByRole("button", { name: "2024" }).click();
  await page.getByPlaceholder("Cerca per nome o tipo…").fill("aboleth");
  const row = page.locator("main ul li[data-card-row]").filter({ hasText: "Aboleth" }).first();
  await row.getByRole("button", { name: "Nascondi dal sito: Aboleth" }).click();
  await expect(row.getByText("Nascosta", { exact: true })).toBeVisible();
  await expect.poll(async () => (await request.get("/mostro/aboleth")).status()).toBe(404);
  await generic(request, "/mostro/aboleth", "Aboleth");
  await row.getByRole("button", { name: "Mostra sul sito: Aboleth" }).click();
  await expect.poll(async () => (await request.get("/mostro/aboleth")).status()).toBe(200);

  // The 2014 edition of the spells hidden from /admin/sezioni.
  await page.goto("/admin/sezioni");
  const opener = page.locator('button[aria-controls="parti-incantesimi"]');
  if ((await opener.getAttribute("aria-expanded")) !== "true") await opener.click();
  const box = page.locator("#parti-incantesimi");
  await stateRadio(box, "Edizione 2014", "Nascosta").click();
  await expect(stateRadio(box, "Edizione 2014", "Nascosta")).toHaveAttribute("aria-checked", "true");
  await expect.poll(async () => (await request.get("/spell/allarme-2014")).status()).toBe(404);
  await generic(request, "/spell/allarme-2014", "Allarme");
  // An address that never existed: the same generic answer.
  await generic(request, "/spell/incantesimo-che-non-esiste", "Incantesimo non trovato");
  await stateRadio(box, "Edizione 2014", "Visibile").click();
  await expect(stateRadio(box, "Edizione 2014", "Visibile")).toHaveAttribute("aria-checked", "true");
  await expect.poll(async () => (await request.get("/spell/allarme-2014")).status()).toBe(200);
  // The pages built meanwhile are built again, so the next server finds them current (as in e2e/sezioni.spec.mjs).
  for (const path of ["/mostro/aboleth", "/spell/allarme-2014", "/grimorio", "/bestiario", "/ricerca-indice.json"]) {
    expect((await request.get(path)).status(), path).toBe(200);
  }
});
