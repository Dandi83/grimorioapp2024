"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { setContentEditionAction } from "@/app/actions/admin-editions";

export function AdminEditionPicker({ kind, id, name, edition, listEdition }: {
  kind: "monster" | "spell"; id: string; name: string; edition?: "2014" | "2024";
  /** The edition of the list: moving the card to the other one makes it leave the list, so it is confirmed first. */
  listEdition: "2014" | "2024";
}) {
  const [result, action] = useActionState(setContentEditionAction, null);
  return (
    <form action={action} className="mt-2 flex flex-wrap items-center gap-2" onSubmit={event => {
      const chosen = new FormData(event.currentTarget).get("edition");
      if ((chosen === "2014" || chosen === "2024") && chosen !== listEdition && !confirm(`Spostare questa scheda nell’edizione ${chosen}?`)) event.preventDefault();
    }}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <PickerFields name={name} edition={edition} />
      {result && <p role={result.ok ? "status" : "alert"} className={`w-full text-xs ${result.ok ? "text-muted-foreground" : "text-destructive"}`}>
        {result.ok ? "Etichetta salvata." : result.error}
      </p>}
    </form>
  );
}

function PickerFields({ name, edition }: { name: string; edition?: "2014" | "2024" }) {
  const { pending } = useFormStatus();
  return <>
    <select name="edition" defaultValue={edition ?? ""} aria-label={`Edizione di ${name}`} disabled={pending}
      className="min-w-0 max-w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus-visible:outline-primary disabled:opacity-50">
      <option value="">Automatica</option>
      <option value="2014">D&amp;D5e 2014</option>
      <option value="2024">D&amp;D5e 2024</option>
    </select>
    <button type="submit" disabled={pending} aria-label={`Salva etichetta di ${name}`}
      className="rounded-md border border-border px-2 py-1.5 text-xs text-foreground hover:border-primary focus-visible:outline-primary disabled:opacity-50">
      {pending ? "Salvataggio…" : "Salva etichetta"}
    </button>
  </>;
}
