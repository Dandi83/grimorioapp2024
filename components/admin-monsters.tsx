"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  createMonsterAction,
  updateMonsterAction,
  deleteMonsterAction,
} from "@/app/actions/admin-monsters";
import type { Monster } from "@/lib/monsters-types";
import { gsLabel, monsterColor, typeCategory } from "@/lib/monsters-types";
import { Pencil, Trash2, Plus, Search, ExternalLink, X } from "lucide-react";

type Editing =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; monster: Monster };

export function AdminMonsters({ monsters }: { monsters: Monster[] }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Editing>({ mode: "closed" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return monsters;
    return monsters.filter(
      (m) =>
        m.nome.toLowerCase().includes(q) || m.tipo.toLowerCase().includes(q),
    );
  }, [query, monsters]);

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca per nome o tipo…"
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
        {filtered.map((m) => (
          <li
            key={m.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
          >
            <span
              className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg px-1.5 text-xs font-semibold"
              style={{
                backgroundColor: `${monsterColor(m.tipo)}22`,
                color: monsterColor(m.tipo),
              }}
            >
              {m.grado_sfida || "?"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{m.nome}</p>
              <p className="truncate text-xs text-muted-foreground">
                {gsLabel(m.grado_sfida)} · {typeCategory(m.tipo) || "—"}
                {m.taglia ? ` · ${m.taglia}` : ""}
              </p>
            </div>
            <Link
              href={`/mostro/${m.id}`}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
              title="Vedi"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={() => setEditing({ mode: "edit", monster: m })}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:text-primary"
              title="Modifica"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
            <DeleteButton id={m.id} nome={m.nome} />
          </li>
        ))}
        {filtered.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Nessun mostro trovato.
          </li>
        ) : null}
      </ul>

      {editing.mode !== "closed" ? (
        <MonsterEditor
          key={editing.mode === "edit" ? editing.monster.id : "create"}
          monster={editing.mode === "edit" ? editing.monster : null}
          onClose={() => setEditing({ mode: "closed" })}
        />
      ) : null}
    </>
  );
}

function DeleteButton({ id, nome }: { id: string; nome: string }) {
  return (
    <form
      action={deleteMonsterAction}
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

type Field = { name: keyof Monster; label: string; textarea?: boolean };

const TEXT_FIELDS: Field[] = [
  { name: "nome", label: "Nome" },
  { name: "tipo", label: "Tipo (es. Umanoide (goblinoide))" },
  { name: "taglia", label: "Taglia" },
  { name: "allineamento", label: "Allineamento" },
  { name: "grado_sfida", label: "Grado sfida (es. 1/4)" },
  { name: "px", label: "Punti esperienza" },
  { name: "classe_armatura", label: "Classe armatura" },
  { name: "punti_ferita", label: "Punti ferita" },
  { name: "velocita", label: "Velocità" },
];

const ABILITIES: Field[] = [
  { name: "forza", label: "FOR" },
  { name: "destrezza", label: "DES" },
  { name: "costituzione", label: "COS" },
  { name: "intelligenza", label: "INT" },
  { name: "saggezza", label: "SAG" },
  { name: "carisma", label: "CAR" },
];

const DETAIL_FIELDS: Field[] = [
  { name: "tiri_salvezza", label: "Tiri salvezza" },
  { name: "abilita", label: "Abilità" },
  { name: "vulnerabilita", label: "Vulnerabilità" },
  { name: "resistenze", label: "Resistenze" },
  { name: "immunita_danni", label: "Immunità ai danni" },
  { name: "immunita_condizioni", label: "Immunità alle condizioni" },
  { name: "sensi", label: "Sensi" },
  { name: "linguaggi", label: "Linguaggi" },
];

const BLOCK_FIELDS: Field[] = [
  { name: "tratti", label: "Tratti (accetta HTML)", textarea: true },
  { name: "azioni", label: "Azioni (accetta HTML)", textarea: true },
  { name: "reazioni", label: "Reazioni (accetta HTML)", textarea: true },
  {
    name: "azioni_leggendarie",
    label: "Azioni leggendarie (accetta HTML)",
    textarea: true,
  },
  { name: "descrizione", label: "Descrizione (accetta HTML)", textarea: true },
];

function MonsterEditor({
  monster,
  onClose,
}: {
  monster: Monster | null;
  onClose: () => void;
}) {
  const isEdit = monster !== null;

  async function action(formData: FormData) {
    const result = isEdit
      ? await updateMonsterAction(null, formData)
      : await createMonsterAction(null, formData);
    if (result?.ok) {
      onClose();
    } else {
      alert(result?.error ?? "Errore durante il salvataggio.");
    }
  }

  function textDefault(f: Field): string {
    const v = monster?.[f.name];
    return v === undefined || v === null ? "" : String(v);
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
            {isEdit ? "Modifica mostro" : "Nuovo mostro"}
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

        <form action={action} className="flex flex-col gap-4">
          {isEdit ? <input type="hidden" name="id" value={monster.id} /> : null}

          {TEXT_FIELDS.map((f) => (
            <div key={f.name} className="flex flex-col gap-1.5">
              <label htmlFor={f.name} className="text-sm text-muted-foreground">
                {f.label}
              </label>
              <input
                id={f.name}
                name={f.name}
                defaultValue={textDefault(f)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary"
              />
            </div>
          ))}

          <div>
            <p className="mb-2 text-sm text-muted-foreground">
              Caratteristiche (punteggio 1–30)
            </p>
            <div className="grid grid-cols-3 gap-3">
              {ABILITIES.map((f) => (
                <div key={f.name} className="flex flex-col gap-1.5">
                  <label
                    htmlFor={f.name}
                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {f.label}
                  </label>
                  <input
                    id={f.name}
                    name={f.name}
                    type="number"
                    min={1}
                    max={30}
                    defaultValue={monster ? String(monster[f.name]) : "10"}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-center text-foreground outline-none focus:border-primary"
                  />
                </div>
              ))}
            </div>
          </div>

          {DETAIL_FIELDS.map((f) => (
            <div key={f.name} className="flex flex-col gap-1.5">
              <label htmlFor={f.name} className="text-sm text-muted-foreground">
                {f.label}
              </label>
              <input
                id={f.name}
                name={f.name}
                defaultValue={textDefault(f)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary"
              />
            </div>
          ))}

          {BLOCK_FIELDS.map((f) => (
            <div key={f.name} className="flex flex-col gap-1.5">
              <label htmlFor={f.name} className="text-sm text-muted-foreground">
                {f.label}
              </label>
              <textarea
                id={f.name}
                name={f.name}
                defaultValue={textDefault(f)}
                rows={5}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
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
