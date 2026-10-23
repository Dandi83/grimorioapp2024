"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  deleteSpellAction,
  logoutAction,
} from "@/app/actions/admin";
import type { Spell } from "@/lib/spells-types";
import { levelLabel } from "@/lib/spells-types";
import { schoolColor } from "@/lib/school-colors";
import type { Monster } from "@/lib/monsters-types";
import { AdminMonsters } from "@/components/admin-monsters";
import { AdminCardRow } from "./admin-card-row";
import { VisibilityFilterBar, useCardVisibility, useVisibilityFilter, type VisibilityFilter } from "./admin-card-eye";
import { spellName } from "@/lib/spell-name";
import { SpellEditor } from "./admin-spell-editor";
import { AdminDeleteButton } from "./admin-delete-button";
import type { AdminEdition } from "@/lib/admin-edition";
import {
  BookOpen,
  Skull,
  Plus,
  LogOut,
  Search,
} from "lucide-react";

type Editing =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; spell: Spell };

/** Editors of spells and creatures (database records), opened from the tiles of /admin. */
export function AdminDashboard({
  spells,
  monsters,
  initialTab = "spells",
  edition,
  hiddenSpells = [],
  hiddenMonsters = [],
}: {
  spells: Spell[];
  monsters: Monster[];
  /** Ids of the cards hidden from the site with the eye. */
  hiddenSpells?: string[];
  hiddenMonsters?: string[];
  initialTab?: "spells" | "monsters";
  /** The edition of the admin area: the lists hold only its cards. */
  edition: AdminEdition;
}) {
  const [tab, setTab] = useState<"spells" | "monsters">(initialTab);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Editing>({ mode: "closed" });
  const visibility = useCardVisibility("incantesimo", hiddenSpells);
  const [shown, setShown] = useState<VisibilityFilter>("tutte");
  const hiddenCount = useMemo(() => spells.filter(spell => visibility.isHidden(spell.id)).length, [spells, visibility]);

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return spells;
    return spells.filter(
      (s) =>
        s.nome_italiano.toLowerCase().includes(q) ||
        (s.nome_mostrato ?? "").toLowerCase().includes(q) ||
        s.scuola.toLowerCase().includes(q),
    );
  }, [query, spells]);
  const filtered = useVisibilityFilter(searched, shown, visibility.isHidden);

  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-8 lg:max-w-[1200px]">
      <Link href="/admin" className="mb-4 inline-flex min-h-11 items-center text-[15px] font-bold text-primary">‹ Amministrazione</Link>
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Incantesimi e mostri</h1>
          <p className="text-sm text-muted-foreground">
            Edizione {edition}: {spells.length} incantesimi · {monsters.length} mostri
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

      <div
        role="tablist"
        aria-label="Sezione da gestire"
        className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1"
      >
        {(
          [
            { key: "spells", label: "Incantesimi", Icon: BookOpen },
            { key: "monsters", label: "Mostri", Icon: Skull },
          ] as const
        ).map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {tab === "monsters" ? (
        <AdminMonsters monsters={monsters} edition={edition} hiddenIds={hiddenMonsters} />
      ) : (
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

      <VisibilityFilterBar value={shown} onChange={setShown} hiddenCount={hiddenCount} />
      <ul className="flex flex-col gap-2">
        {filtered.map((s) => {
          const nome = s.nome_mostrato ?? spellName(s.nome_italiano, s.edizione);
          return (
            <AdminCardRow
              key={s.id}
              badge={
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold"
                  style={{ backgroundColor: `${schoolColor(s.scuola)}22`, color: schoolColor(s.scuola) }}
                >
                  {s.livello_num < 0 ? "?" : s.livello_num}
                </span>
              }
              name={nome}
              meta={`${levelLabel(s.livello_num)} · ${s.scuola || "—"}`}
              origine={s.origine}
              href={`/spell/${s.id}`}
              hidden={visibility.isHidden(s.id)}
              onToggleHidden={() => visibility.toggle(s.id, nome)}
              onEdit={() => setEditing({ mode: "edit", spell: s })}
              // Only cards made or added here can be deleted: an SRD card stays (the server refuses it too).
              remove={s.fonte ? undefined : <DeleteButton id={s.id} nome={nome} />}
            />
          );
        })}
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
          edition={edition}
          onClose={() => setEditing({ mode: "closed" })}
          visibility={editing.mode === "edit" ? {
            hidden: visibility.isHidden(editing.spell.id),
            onToggle: () => visibility.toggle(editing.spell.id, editing.spell.nome_mostrato ?? spellName(editing.spell.nome_italiano, editing.spell.edizione)),
            notice: visibility.notice,
          } : undefined}
        />
      ) : null}
      </>
      )}
      {editing.mode === "closed" && visibility.notice}
    </main>
  );
}

function DeleteButton({ id, nome }: { id: string; nome: string }) {
  return <AdminDeleteButton id={id} nome={nome} action={deleteSpellAction} />;
}
