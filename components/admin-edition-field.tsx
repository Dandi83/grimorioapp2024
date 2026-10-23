import type { AdminEdition } from "@/lib/admin-edition";

/**
 * The edition of a card, at the top of its editor. A card with a verified SRD source keeps the edition of
 * its source (fixed text, nothing sent: the stored data stay as they are); any other card (created or
 * added here) has the «Edizione» dropdown, and moving it to the other edition is confirmed on save.
 */
export function AdminEditionField({ edition, source }: { edition: AdminEdition; source?: string }) {
  if (source) {
    return <p data-testid="card-edition" className="rounded-lg border border-border bg-elevated px-3 py-2.5 text-sm font-semibold text-foreground">
      Edizione {edition} · {source}
    </p>;
  }
  return <div>
    <label htmlFor="edition" className="mb-1.5 block text-sm text-muted-foreground">Edizione</label>
    <select id="edition" name="edition" defaultValue={edition}
      className="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-base text-foreground outline-none focus:border-primary">
      <option value="2024">2024</option>
      <option value="2014">2014</option>
    </select>
    <p className="mt-1.5 text-xs leading-5 text-muted-foreground">Scheda senza fonte SRD: scegli l’edizione in cui compare. Spostarla nell’altra edizione chiede conferma.</p>
  </div>;
}

/** Saving a card into the other edition makes it leave the current list: the person confirms first. */
export function confirmEditionMove(form: FormData, edition: AdminEdition): boolean {
  const chosen = form.get("edition");
  return !(chosen === "2014" || chosen === "2024") || chosen === edition || confirm(`Spostare questa scheda nell’edizione ${chosen}?`);
}
