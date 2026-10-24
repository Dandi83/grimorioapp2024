// The edition pill of the public pages (components/edition/edition-pill.tsx): the one in view (the page
// on phones and tablets, the side column on computers), its edition and a choice in its panel.
import { expect } from "@playwright/test";

export const editionPill = page => page.getByRole("button", { name: /^Edizione 20\d\d: cambia la tua edizione$/ }).filter({ visible: true }).first();

export const expectEdition = (page, edition) => expect(editionPill(page)).toHaveAttribute("aria-label", `Edizione ${edition}: cambia la tua edizione`);

export async function chooseEdition(page, edition) {
  await editionPill(page).click();
  const panel = page.getByRole("dialog", { name: "La tua edizione" });
  await panel.getByRole("button", { name: new RegExp(`^${edition}`) }).click();
  await panel.getByRole("button", { name: "Fatto" }).click();
  await expect(panel).toHaveCount(0);
  await expectEdition(page, edition);
}
