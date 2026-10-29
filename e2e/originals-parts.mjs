import { expect } from "@playwright/test";

// PROMPT 25: «Mostri del Grimorio» starts «In arrivo» (lib/section-visibility.ts, DEFAULT_PART_STATES): the creatures
// of the editorial staff stay out of the public pages until the administrator shows them. The tests that need them
// set the part from /admin/sezioni (its save refreshes the cached state) and put it back after.
export const GRIMORIO_TITLE = "Mostri del Grimorio";
export const COMMUNITY_TITLE = "I mostri creati da voi";
const SAID = { Visibile: "visibile", "In arrivo": "in arrivo", Nascosta: "nascosta" };

/** An administrator page, already signed in: the part `title` of the Bestiario set to `label` (Visibile, In arrivo, Nascosta). */
export async function setBestiaryPart(admin, title, label) {
  await admin.goto("/admin/sezioni");
  const radio = admin.getByRole("radiogroup", { name: `Stato di ${title}`, exact: true }).getByRole("radio", { name: label, exact: true });
  if (!(await radio.isVisible())) await admin.locator('[data-section-row="bestiario"]').locator("[data-parts-summary]").click();
  if (await radio.isChecked()) return;
  await radio.click();
  await expect(admin.getByRole("status").filter({ hasText: `${title} ora è ${SAID[label]}` })).toBeVisible();
}
