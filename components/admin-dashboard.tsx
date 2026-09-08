"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  createSpellAction,
  updateSpellAction,
  deleteSpellAction,
  logoutAction,
} from "@/app/actions/admin";
import type { Spell } from "@/lib/spells-types";
import { levelLabel } from "@/lib/spells-types";
import { schoolColor } from "@/lib/school-colors";
import {
  Pencil,
  Trash2,
  Plus,
  LogOut,
  Search,
  ExternalLink,
  X,
} from "lucide-react";

type Editing =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; spell: Spell };

export function AdminDashboard({ spells }: { spells: Spell[] }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Editing>({ mode: "closed" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return spells;
    return spells.filter(
      (s) =>
        s.nome_italiano.toLowerCase().includes(q) ||
        s.scuola.toLowerCase().includes(q),
    );
  }, [query, spells]);

  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-8">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Amministrazione</h1>
          <p className="text-sm text-muted-foreground">
            {spells.length} incantesimi nel grimorio
          </p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Esci
          </button>
        </form>
      </header>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca per nome o scuola…"
            className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-foreground outline-none focus:border-primary"
          />
        </div>
        <button
          type="button"
          onClick={() => setEditing({ mode: "create" })}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuovo
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {filtered.map((s) => (
          <li
            key={s.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold"
              style={{
                backgroundColor: `${schoolColor(s.scuola)}22`,
                color: schoolColor(s.scuola),
              }}
            >
              {s.livello_num < 0 ? "?" : s.livello_num}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">
                {s.nome_italiano}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {levelLabel(s.livello_num)} · {s.scuola || "—"}
              </p>
            </div>
            <Link
              href={`/spell/${s.id}`}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
              title="Vedi"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={() => setEditing({ mode: "edit", spell: s })}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:text-primary"
              title="Modifica"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
            <DeleteButton id={s.id} nome={s.nome_italiano} />
          </li>
        ))}
        {filtered.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Nessun incantesimo trovato.
          </li>
        ) : null}
      </ul>

      {editing.mode !== "closed" ? (
        <SpellEditor
          key={editing.mode === "edit" ? editing.spell.id : "create"}
          spell={editing.mode === "edit" ? editing.spell : null}
          onClose={() => setEditing({ mode: "closed" })}
        />
      ) : null}
    </main>
  );
}

function DeleteButton({ id, nome }: { id: string; nome: string }) {
  return (
    <form
      action={deleteSpellAction}
      onSubmit={(e) => {
        if (!confirm(`Eliminare "${nome}"? L'operazione è definitiva.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-md p-2 text-muted-foreground transition-colors hover:text-destructive"
        title="Elimina"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
}

const FIELDS: { name: keyof Spell; label: string; textarea?: boolean }[] = [
  { name: "nome_italiano", label: "Nome" },
  { name: "livello", label: "Livello / Scuola / Classi (testo completo)" },
  { name: "tempo_di_lancio", label: "Tempo di lancio" },
  { name: "gittata", label: "Gittata" },
  { name: "componenti", label: "Componenti" },
  { name: "durata", label: "Durata" },
  { name: "descrizione", label: "Descrizione (accetta HTML)", textarea: true },
];

function SpellEditor({
  spell,
  onClose,
}: {
  spell: Spell | null;
  onClose: () => void;
}) {
  const isEdit = spell !== null;

  async function action(formData: FormData) {
    const result = isEdit
      ? await updateSpellAction(null, formData)
      : await createSpellAction(null, formData);
    if (result?.ok) {
      onClose();
    } else {
      alert(result?.error ?? "Errore durante il salvataggio.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-border bg-card p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl text-foreground">
            {isEdit ? "Modifica incantesimo" : "Nuovo incantesimo"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
            aria-label="Chiudi"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
          Livello, scuola e classi vengono ricavati automaticamente dal campo
          &quot;Livello&quot;. Scrivilo come negli altri incantesimi, es.
          &quot;Divinazione di 2° livello (mago, stregone)&quot; oppure
          &quot;Trucchetto di invocazione (mago)&quot;.
        </p>

        <form action={action} className="flex flex-col gap-4">
          {isEdit ? <input type="hidden" name="id" value={spell.id} /> : null}
          {FIELDS.map((f) => (
            <div key={f.name} className="flex flex-col gap-1.5">
              <label htmlFor={f.name} className="text-sm text-muted-foreground">
                {f.label}
              </label>
              {f.textarea ? (
                <textarea
                  id={f.name}
                  name={f.name}
                  defaultValue={spell?.[f.name] as string | undefined}
                  rows={7}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              ) : (
                <input
                  id={f.name}
                  name={f.name}
                  defaultValue={spell?.[f.name] as string | undefined}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary"
                />
              )}
            </div>
          ))}

          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-4 py-3 text-muted-foreground transition-colors hover:text-foreground"
            >
              Annulla
            </button>
            <SubmitButton isEdit={isEdit} />
          </div>
        </form>
      </div>
    </div>
  );
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-1 rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Salvataggio…" : isEdit ? "Salva modifiche" : "Crea"}
    </button>
  );
}
