import { HABITATS } from "@/lib/habitats";

/** Several habitats can be ticked; "habitat_present" tells the save that this form has the field. */
export function AdminHabitatField({ habitats = [], projectOnly = false }: { habitats?: readonly string[]; projectOnly?: boolean }) {
  return (
    <fieldset className="min-w-0 rounded-xl border border-border p-4">
      <legend className="px-1 font-serif text-xl text-primary">Habitat</legend>
      <input type="hidden" name="habitat_present" value="1" />
      <p className="mb-3 text-xs leading-5 text-muted-foreground">
        Scegli uno o più habitat. Le due edizioni dello stesso mostro condividono l’habitat.
        {projectOnly && " Scheda SRD: si può modificare solo l’habitat."}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {HABITATS.map(habitat => (
          <label key={habitat} className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-foreground has-[:checked]:border-primary">
            <input type="checkbox" name="habitat" value={habitat} defaultChecked={habitats.includes(habitat)} className="h-4 w-4 accent-[var(--color-primary)]" />
            {habitat}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
