"use client";

import { AdminDeleteButton } from "./admin-delete-button";

import { useMemo, useState } from "react";
import {
  deleteMonsterAction,
} from "@/app/actions/admin-monsters";
import { deleteHomebrewAction } from "@/app/actions/admin-homebrew";
import { EditHomebrewDialog, NewHomebrewButton } from "./homebrew/admin-proposals";
import type { HomebrewDraft } from "@/lib/homebrew-types";
import type { Monster } from "@/lib/monsters-types";
import { gsLabel, monsterColor, typeCategory } from "@/lib/monsters-types";
import { Plus, Search } from "lucide-react";
import { MonsterEditor } from "./admin-monster-editor";
import { AdminCardRow } from "./admin-card-row";
import { VisibilityFilterBar, useCardVisibility, useVisibilityFilter, type VisibilityFilter } from "./admin-card-eye";
import { ProvenanceGroup, useProvenanceFilter } from "./admin-edit/provenance-filter";
import { matchesProvenance, provenanceIds } from "@/lib/provenance";
import type { AdminEdition } from "@/lib/admin-edition";

type Editing =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; monster: Monster };

/** hiddenIds: the creatures hidden from the site with the eye. */
const NO_IDS: string[] = [];

export function AdminMonsters({ monsters, edition, hiddenIds = [], homebrewDrafts = {}, modifiedIds = NO_IDS }: {
  monsters: Monster[]; edition: AdminEdition; hiddenIds?: string[]; homebrewDrafts?: Record<string, HomebrewDraft>;
  /** «SRD modificate» (lib/srd-modified.ts), for the «Provenienza» filter. */
  modifiedIds?: string[];
}) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Editing>({ mode: "closed" });
  const close = () => setEditing({ mode: "closed" });
  const visibility = useCardVisibility("mostro", hiddenIds);
  const [shown, setShown] = useState<VisibilityFilter>("tutte");
  const hiddenCount = useMemo(() => monsters.filter(monster => visibility.isHidden(monster.id)).length, [monsters, visibility]);

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return monsters;
    return monsters.filter(
      (m) =>
        m.nome.toLowerCase().includes(q) || m.tipo.toLowerCase().includes(q),
    );
  }, [query, monsters]);
  const visibleRows = useVisibilityFilter(searched, shown, visibility.isHidden);
  // «Provenienza»: the same rule as the «NO SRD» pill, from the labels of the cards (lib/provenance.ts); the modified
  // SRD cards («SRD modificate», lib/srd-modified.ts) from the server.
  const origin = useProvenanceFilter(useMemo(() => provenanceIds(monsters, modifiedIds), [monsters, modifiedIds]));
  const filtered = useMemo(() => visibleRows.filter(x => matchesProvenance({ id: x.id, homebrew: !!x.homebrew_edizione }, origin.value, origin.ids!)), [visibleRows, origin.value, origin.ids]);

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
        <NewHomebrewButton edition={edition} />
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
      <div className="-mt-3 mb-4">
        <ProvenanceGroup value={origin.value} onChange={origin.setValue} />
        <p aria-live="polite" className="mt-2 text-sm text-muted-foreground" data-provenance-count="">{filtered.length} {filtered.length === 1 ? "risultato" : "risultati"}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {filtered.map((m) => (
          <AdminCardRow
            key={m.id}
            badge={
              <span
                className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg px-1.5 text-xs font-semibold"
                // The colour of the type darkened towards the ink: at least 4.5:1 on its tint.
                style={{ backgroundColor: `${monsterColor(m.tipo)}22`, color: `color-mix(in srgb, ${monsterColor(m.tipo)} 45%, #2B2118)` }}
              >
                {m.grado_sfida || "?"}
              </span>
            }
            name={m.nome}
            meta={`${gsLabel(m.grado_sfida)} · ${typeCategory(m.tipo) || "—"}${m.taglia ? ` · ${m.taglia}` : ""}`}
            origine={m.homebrew_edizione ? `Homebrew${m.homebrew_edizione === "entrambe" ? " · 2014 e 2024" : ""}` : m.provenienza?.document ?? (m.fonte_scheda === "Sintesi originale" ? "Sintesi originale" : "Aggiunta da te")}
            href={`/mostro/${m.id}`}
            hidden={visibility.isHidden(m.id)}
            onToggleHidden={() => visibility.toggle(m.id, m.nome)}
            onEdit={() => setEditing({ mode: "edit", monster: m })}
            // Only creatures made or added here can be deleted: an SRD sheet stays (the server refuses it too).
            remove={m.provenienza ? undefined : <AdminDeleteButton id={m.id} nome={m.nome} action={m.homebrew_edizione ? deleteHomebrewAction : deleteMonsterAction} />}
          />
        ))}
        {filtered.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Nessun mostro trovato.
          </li>
        ) : null}
      </ul>

      {editing.mode === "edit" && homebrewDrafts[editing.monster.id] ? (
        <EditHomebrewDialog id={editing.monster.id} nome={editing.monster.nome} draft={homebrewDrafts[editing.monster.id]} onClose={close} />
      ) : editing.mode !== "closed" ? (
        <MonsterEditor
          key={editing.mode === "edit" ? editing.monster.id : "create"}
          monster={editing.mode === "edit" ? editing.monster : null}
          edition={edition}
          onClose={close}
          visibility={editing.mode === "edit" ? {
            hidden: visibility.isHidden(editing.monster.id),
            onToggle: () => visibility.toggle(editing.monster.id, editing.monster.nome),
            notice: visibility.notice,
          } : undefined}
        />
      ) : null}
      {editing.mode === "closed" && visibility.notice}
    </>
  );
}

