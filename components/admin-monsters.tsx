"use client";

import { AdminDeleteButton } from "./admin-delete-button";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  deleteMonsterAction,
} from "@/app/actions/admin-monsters";
import type { Monster } from "@/lib/monsters-types";
import { gsLabel, monsterColor, typeCategory } from "@/lib/monsters-types";
import { Pencil, Plus, Search, ExternalLink } from "lucide-react";
import { MonsterEditor } from "./admin-monster-editor";
import { SourceLabel } from "./admin-source-label";
import type { AdminEdition } from "@/lib/admin-edition";

type Editing =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; monster: Monster };

export function AdminMonsters({ monsters, edition }: { monsters: Monster[]; edition: AdminEdition }) {
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
              <p className="flex min-w-0 gap-1 text-xs text-muted-foreground">
                <span className="truncate">
                  {gsLabel(m.grado_sfida)} · {typeCategory(m.tipo) || "—"}
                  {m.taglia ? ` · ${m.taglia}` : ""}
                </span>
                <span className="shrink-0">· <SourceLabel origine={m.provenienza?.document ?? "Aggiunta da te"} /></span>
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
            {/* Only creatures made or added here can be deleted: an SRD sheet stays (the server refuses it too). */}
            {m.provenienza ? <span className="w-8 shrink-0" aria-hidden="true" /> : <DeleteButton id={m.id} nome={m.nome} />}
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
          edition={edition}
          onClose={() => setEditing({ mode: "closed" })}
        />
      ) : null}
    </>
  );
}

function DeleteButton({ id, nome }: { id: string; nome: string }) {
  return <AdminDeleteButton id={id} nome={nome} action={deleteMonsterAction} />;
}
