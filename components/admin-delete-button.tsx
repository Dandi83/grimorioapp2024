"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

type DeleteResult = { ok: true } | { ok: false; error: string };

/** Asks for confirmation, deletes, and shows why when the deletion fails. */
export function AdminDeleteButton({ id, nome, action }: {
  id: string;
  nome: string;
  action: (formData: FormData) => Promise<DeleteResult>;
}) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={formData => {
        setError("");
        startTransition(async () => {
          try {
            const result = await action(formData);
            if (!result.ok) setError(result.error);
          } catch {
            setError("Eliminazione non riuscita. Controlla la connessione e riprova.");
          }
        });
      }}
      onSubmit={(e) => {
        if (!confirm(`Eliminare "${nome}"? L'operazione è definitiva.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md p-2 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
        title="Elimina"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
      {error && <p role="alert" className="max-w-48 text-xs text-destructive">{error}</p>}
    </form>
  );
}
