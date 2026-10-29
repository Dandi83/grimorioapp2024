"use client";

import { useEffect } from "react";

import type { Spell } from "@/lib/spells-types";
import type { Monster } from "@/lib/monsters-types";
import type { HomebrewDraft } from "@/lib/homebrew-types";
import type { AdminEdition } from "@/lib/admin-edition";
import { spellName } from "@/lib/spell-name";
import { SpellEditor } from "./admin-spell-editor";
import { MonsterEditor } from "./admin-monster-editor";
import { EditHomebrewDialog } from "./homebrew/admin-proposals";
import { useCardVisibility } from "./admin-card-eye";
import { adoptEditorStep, leaveEditor } from "@/lib/admin-edit-return";

/** The card of /admin/incantesimi/<id> or /admin/mostri/<id>: a spell, a creature or a published homebrew. */
export type EditorCard =
  | { kind: "incantesimo"; spell: Spell }
  | { kind: "mostro"; monster: Monster }
  | { kind: "homebrew"; id: string; nome: string; draft: HomebrewDraft; ours?: boolean };

/**
 * The editor of one card as the page («Modifica» on its public card): «‹ Torna alla scheda», then the
 * editor, already in the server HTML, with nothing behind it. Saving, closing or «Torna alla scheda» go back
 * in the history to the card (never a new step: «indietro» on the card then leads to its list), and after a
 * save the card shows what was saved (lib/admin-edit-return.ts).
 */
export function AdminCardEditor({ card, edition, back, hidden }: { card: EditorCard; edition: AdminEdition; back: string; hidden: boolean }) {
  const id = card.kind === "incantesimo" ? card.spell.id : card.kind === "mostro" ? card.monster.id : card.id;
  const visibility = useCardVisibility(card.kind === "incantesimo" ? "incantesimo" : "mostro", hidden ? [id] : []);
  useEffect(() => adoptEditorStep(back), [back]);
  const close = (saved?: boolean) => leaveEditor(back, saved);
  const eye = (nome: string) => ({ hidden: visibility.isHidden(id), onToggle: () => visibility.toggle(id, nome), notice: visibility.notice });
  return (
    <div className="mx-auto w-full max-w-3xl px-2 pb-6 sm:px-4">
      <a href={back} onClick={event => { event.preventDefault(); close(); }} className="inline-flex min-h-11 items-center px-2 text-[15px] font-bold text-primary">‹ Torna alla scheda</a>
      {card.kind === "incantesimo" ? (
        <SpellEditor page spell={card.spell} edition={edition} onClose={close} visibility={eye(card.spell.nome_mostrato ?? spellName(card.spell.nome_italiano, card.spell.edizione))} />
      ) : card.kind === "mostro" ? (
        <MonsterEditor page monster={card.monster} edition={edition} onClose={close} visibility={eye(card.monster.nome)} />
      ) : (
        <EditHomebrewDialog page id={card.id} nome={card.nome} draft={card.draft} ours={card.ours} onClose={close} />
      )}
    </div>
  );
}
