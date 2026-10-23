"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, Pencil, X } from "lucide-react";
import { createMonsterAction, updateMonsterAction } from "@/app/actions/admin-monsters";
import { abilityMod, type Monster } from "@/lib/monsters-types";
import { AdminMonsterField } from "./admin-monster-field";
import { MonsterContentEditor } from "./admin-monster-content";
import { AdminMonsterPreview } from "./admin-monster-preview";
import { AdminEditionField, confirmEditionMove } from "./admin-edition-field";
import type { AdminEdition } from "@/lib/admin-edition";
import { AdminHabitatField } from "./admin-habitat-field";

type Field = { name: keyof Monster; label: string; placeholder?: string };
const IDENTITY: Field[] = [
  { name: "nome", label: "Nome", placeholder: "Es. Guardiano delle rovine" },
  { name: "tipo", label: "Tipo", placeholder: "Es. Costrutto" },
  { name: "taglia", label: "Taglia" },
  { name: "allineamento", label: "Allineamento", placeholder: "Es. neutrale" },
  {
    name: "sottotitolo_fonte",
    label: "Sottotitolo personalizzato",
    placeholder: "Facoltativo: sostituisce taglia, tipo e allineamento nell’intestazione",
  },
];
const COMBAT: Field[] = [
  { name: "classe_armatura", label: "Classe armatura", placeholder: "Es. 16 (armatura naturale)" },
  { name: "punti_ferita", label: "Punti ferita", placeholder: "Es. 45 (6d8 + 18)" },
  { name: "velocita", label: "Velocità", placeholder: "Es. 9 m, volo 18 m" },
  { name: "grado_sfida", label: "Grado di sfida", placeholder: "Es. 1/4, 2, 10" },
  { name: "px", label: "Punti esperienza", placeholder: "Es. 450" },
  { name: "iniziativa", label: "Iniziativa", placeholder: "Es. +4 (14)" },
  { name: "bonus_competenza", label: "Bonus di competenza", placeholder: "Es. +3" },
];
const ABILITIES: Field[] = [
  { name: "forza", label: "FOR" },
  { name: "destrezza", label: "DES" },
  { name: "costituzione", label: "COS" },
  { name: "intelligenza", label: "INT" },
  { name: "saggezza", label: "SAG" },
  { name: "carisma", label: "CAR" },
];
const DETAILS: Field[] = [
  { name: "tiri_salvezza", label: "Tiri salvezza", placeholder: "Es. Cos +5, Sag +3" },
  { name: "abilita", label: "Abilità", placeholder: "Es. Percezione +4, Furtività +6" },
  { name: "vulnerabilita", label: "Vulnerabilità", placeholder: "Es. fuoco" },
  { name: "resistenze", label: "Resistenze", placeholder: "Es. freddo, fulmine" },
  { name: "immunita_danni", label: "Immunità ai danni", placeholder: "Es. veleno" },
  {
    name: "immunita_condizioni",
    label: "Immunità alle condizioni",
    placeholder: "Es. avvelenato, spaventato",
  },
  {
    name: "immunita",
    label: "Immunità combinate",
    placeholder: "Facoltativo: danni e condizioni nella stessa voce",
  },
  // Same position as on the sheet: after the immunities, before the senses.
  { name: "attrezzatura", label: "Equipaggiamento", placeholder: "Es. Corazza" },
  { name: "sensi", label: "Sensi", placeholder: "Es. scurovisione 18 m; Percezione passiva 14" },
  { name: "linguaggi", label: "Linguaggi", placeholder: "Es. Comune, Draconico" },
];
const BLOCKS = [
  { name: "tratti", label: "Tratti", singular: "Tratto" },
  { name: "azioni", label: "Azioni", singular: "Azione" },
  { name: "azioni_bonus", label: "Azioni bonus", singular: "Azione bonus" },
  { name: "reazioni", label: "Reazioni", singular: "Reazione" },
  { name: "azioni_leggendarie", label: "Azioni leggendarie", singular: "Azione leggendaria" },
  { name: "descrizione", label: "Descrizione", singular: "Descrizione" },
] as const;
const inputClass =
  "w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-base text-foreground outline-none focus:border-primary";

function EditorFields({ fields, monster }: { fields: Field[]; monster: Monster | null }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.name} className="min-w-0">
          <label htmlFor={field.name} className="mb-1.5 block text-sm text-muted-foreground">
            {field.label}
            {field.name === "nome" ? " *" : ""}
          </label>
          <AdminMonsterField
            name={field.name}
            label={field.label}
            initialValue={String(monster?.[field.name] ?? "")}
            placeholder={field.placeholder}
          />
        </div>
      ))}
    </div>
  );
}

export function MonsterEditor({
  monster,
  onClose,
  edition,
}: {
  monster: Monster | null;
  onClose: () => void;
  /** The edition of the admin area: the card belongs to it, and a new card starts in it. */
  edition: AdminEdition;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [preview, setPreview] = useState<Partial<Monster> | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [scores, setScores] = useState(() =>
    Object.fromEntries(ABILITIES.map((field) => [field.name, Number(monster?.[field.name] ?? 10)])),
  );
  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  function showPreview() {
    if (!form.current) return;
    if (!form.current.reportValidity()) return;
    const entries = Object.fromEntries(new FormData(form.current).entries());
    const snapshot: Record<string, unknown> = {
      ...entries,
      habitat: new FormData(form.current).getAll("habitat"),
      id: monster?.id || "unsaved-monster",
      edizione: entries.edition || edition,
    };
    for (const field of ABILITIES) snapshot[field.name] = Number(entries[field.name]) || 10;
    setPreview(snapshot as Partial<Monster>);
    dialog.current?.scrollTo({ top: 0 });
  }

  async function action(data: FormData) {
    setError("");
    setSaving(true);
    try {
      const result = monster
        ? await updateMonsterAction(null, data)
        : await createMonsterAction(null, data);
      if (result?.ok) onClose();
      else
        setError(
          result?.error || "Salvataggio non riuscito. I dati inseriti sono ancora nel modulo.",
        );
    } catch {
      setError("Salvataggio non riuscito. I dati inseriti sono ancora nel modulo: riprova.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="monster-editor-heading"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
      className="fixed inset-0 m-auto max-h-[94dvh] w-[calc(100%-1rem)] max-w-3xl overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/80"
    >
      <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-card px-4 py-4 sm:px-6">
        <div>
          <h2 id="monster-editor-heading" className="font-serif text-2xl">
            {monster ? "Modifica mostro" : "Nuovo mostro"}
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Compila la scheda: alla formattazione pensa il Grimorio.
          </p>
          {monster?.solo_progetto && (
            <p className="mt-1 text-xs leading-5 text-primary">
              Scheda SRD: il salvataggio aggiorna solo habitat ed etichetta, il testo resta quello ufficiale.
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={onClose}
          aria-label="Chiudi editor"
          className="min-h-11 min-w-11 rounded-lg text-muted-foreground hover:bg-elevated"
        >
          <X className="mx-auto h-5 w-5" aria-hidden />
        </button>
      </header>
      <form
        ref={form}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          if (confirmEditionMove(data, edition)) void action(data);
        }}
        className="min-w-0"
      >
        {monster && <input type="hidden" name="id" value={monster.id} />}
        <fieldset disabled={saving} className="min-w-0 p-4 sm:p-6">
          <div hidden={preview !== null} className="space-y-5">
            <AdminEditionField edition={edition} source={monster?.provenienza?.document} />
            <details open className="rounded-xl border border-border p-4">
              <summary className="mb-3 min-h-11 cursor-pointer font-serif text-xl text-primary">
                Identità
              </summary>
              <EditorFields fields={IDENTITY} monster={monster} />
            </details>
            <AdminHabitatField habitats={monster?.habitat} projectOnly={!!monster?.solo_progetto} />
            <details open className="rounded-xl border border-border p-4">
              <summary className="mb-3 min-h-11 cursor-pointer font-serif text-xl text-primary">
                Statistiche di combattimento
              </summary>
              <EditorFields fields={COMBAT} monster={monster} />
            </details>
            <section className="rounded-xl border border-border p-4">
              <h3 className="mb-1 font-serif text-xl text-primary">Caratteristiche</h3>
              <p className="mb-4 text-xs leading-5 text-muted-foreground">
                Inserisci i punteggi da 1 a 30. I modificatori sono automatici.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {ABILITIES.map((field) => (
                  <div key={field.name}>
                    <label
                      htmlFor={field.name}
                      className="mb-1 block text-center text-xs font-semibold"
                    >
                      {field.label}
                    </label>
                    <input
                      id={field.name}
                      name={field.name}
                      type="number"
                      min={1}
                      max={30}
                      step={1}
                      required
                      value={Number.isNaN(scores[field.name]) ? "" : scores[field.name]}
                      onChange={(event) =>
                        setScores((previous) => ({
                          ...previous,
                          [field.name]:
                            event.target.value === "" ? NaN : Number(event.target.value),
                        }))
                      }
                      className={`${inputClass} text-center`}
                    />
                    <p className="mt-1 text-center text-xs text-primary">
                      {Number.isFinite(scores[field.name]) ? abilityMod(scores[field.name]) : "—"}
                    </p>
                  </div>
                ))}
              </div>
            </section>
            <details className="rounded-xl border border-border p-4">
              <summary className="min-h-11 cursor-pointer font-serif text-xl text-primary">
                Difese, abilità e sensi{" "}
                <span className="text-xs text-muted-foreground">· facoltativi</span>
              </summary>
              <div className="mt-3">
                <EditorFields fields={DETAILS} monster={monster} />
              </div>
            </details>
            {BLOCKS.map((block) => (
              <MonsterContentEditor
                key={block.name}
                {...block}
                initialHtml={monster?.[block.name] || ""}
                descriptionOnly={block.name === "descrizione"}
              />
            ))}
          </div>
          {preview && (
            <div
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("a")) event.preventDefault();
              }}
            >
              <AdminMonsterPreview
                monster={preview}
                legacy={
                  preview.edizione === "2014" ||
                  (!preview.edizione && monster?.provenienza?.edition === "2014")
                }
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Anteprima locale al modulo. I collegamenti sono mostrati senza lasciare l’editor.
              </p>
            </div>
          )}
        </fieldset>
        <footer className="sticky bottom-0 z-10 border-t border-border bg-card px-4 py-4 sm:px-6">
          {error && (
            <p role="alert" className="mb-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <p className="mb-3 text-xs leading-5 text-muted-foreground">
            Il salvataggio aggiorna direttamente il catalogo. L’anteprima non salva dati.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => (preview ? setPreview(null) : showPreview())}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm"
            >
              {preview ? (
                <Pencil className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
              {preview ? "Torna al modulo" : "Anteprima"}
            </button>
            <SaveButton editing={!!monster} pending={saving} />
          </div>
        </footer>
      </form>
    </dialog>
  );
}

function SaveButton({ editing, pending }: { editing: boolean; pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 flex-1 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
    >
      {pending ? "Salvataggio…" : editing ? "Salva modifiche" : "Crea nel catalogo"}
    </button>
  );
}
