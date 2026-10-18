import type { RulesEdition } from "@/lib/content-editions";

export function AdminEditionField({ edition }: { edition?: RulesEdition }) {
  return <div>
    <label htmlFor="edition" className="mb-1.5 block text-sm text-muted-foreground">Etichetta edizione</label>
    <select id="edition" name="edition" defaultValue={edition ?? ""}
      className="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-base text-foreground outline-none focus:border-primary">
      <option value="">Da verificare / automatica</option>
      <option value="2024">D&amp;D5e 2024</option>
      <option value="2014">D&amp;D5e 2014</option>
    </select>
    <p className="mt-1.5 text-xs leading-5 text-muted-foreground">L’etichetta compare accanto al nome nel catalogo. La scelta automatica usa l’edizione della fonte, se riconosciuta.</p>
  </div>;
}
