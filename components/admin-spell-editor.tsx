"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, Pencil, X } from "lucide-react";
import { createSpellAction, updateSpellAction } from "@/app/actions/admin";
import { capitalizeWords, parseLivello, type Spell } from "@/lib/spells-types";
import { inlineConditionReferences } from "@/lib/conditions";
import { inlineSpellReferences } from "@/lib/spell-references";
import { AdminChoiceField } from "./admin-choice-field";
import { AdminVisualText } from "./admin-visual-text";
import { SpellClassification, SpellComponents } from "./admin-spell-fields";
import { HtmlText } from "./html-text";
import { AdminEditionField, confirmEditionMove } from "./admin-edition-field";
import type { AdminEdition } from "@/lib/admin-edition";
import { RulesEditionBadge } from "./rules-edition-badge";

const inputClass =
  "w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-base text-foreground outline-none focus:border-primary";
const PRESETS = [
  {
    name: "tempo_di_lancio",
    label: "Tempo di lancio",
    choices: [
      "azione",
      "azione bonus",
      "reazione",
      "1 minuto",
      "10 minuti",
      "1 ora",
      "8 ore",
      "24 ore",
      "azione o rituale",
      "1 minuto o rituale",
      "10 minuti o rituale",
    ],
    placeholder: "Es. reazione, quando l’incantatore subisce danni",
  },
  {
    name: "gittata",
    label: "Gittata",
    choices: [
      "incantatore",
      "contatto",
      "1,5 metri",
      "3 metri",
      "9 metri",
      "18 metri",
      "27 metri",
      "30 metri",
      "36 metri",
      "45 metri",
      "90 metri",
      "vista",
      "illimitata",
    ],
    placeholder: "Es. incantatore (cono di 4,5 metri)",
  },
  {
    name: "durata",
    label: "Durata",
    choices: [
      "istantanea",
      "1 round",
      "1 minuto",
      "10 minuti",
      "1 ora",
      "8 ore",
      "24 ore",
      "concentrazione, fino a 1 minuto",
      "concentrazione, fino a 10 minuti",
      "concentrazione, fino a 1 ora",
      "finché non viene dissolto",
    ],
    placeholder: "Scrivi la durata completa",
  },
] as const;

function SpellPreview({ spell }: { spell: Spell }) {
  const references = spell.edizione === "2014" ? [] : inlineConditionReferences;
  return (
    <article className="spell-sheet min-w-0 rounded-xl border border-primary/20 bg-background p-5 sm:p-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
        Anteprima · non ancora salvata
      </p>
      <h2 className="break-words font-serif text-3xl text-foreground">
        {capitalizeWords(spell.nome_italiano)}
      </h2>
      <RulesEditionBadge edition={spell.edizione} compact />
      <p className="mt-2 text-sm text-primary">{spell.livello}</p>
      <dl className="my-5 grid grid-cols-2 gap-3">
        {(
          [
            ["Tempo di lancio", "tempo_di_lancio"],
            ["Gittata", "gittata"],
            ["Componenti", "componenti"],
            ["Durata", "durata"],
          ] as const
        ).map(([label, key]) => (
          <div key={key} className="min-w-0 rounded-xl border border-border bg-card p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 break-words text-sm leading-6">{spell[key] || "—"}</dd>
          </div>
        ))}
      </dl>
      {!!spell.classi.length && (
        <div className="mb-5 flex flex-wrap gap-2">
          {spell.classi.map((name, index) => (
            <span
              key={`${name}-${index}`}
              className="rounded-full border border-primary/30 px-3 py-1 text-xs text-primary"
            >
              {capitalizeWords(name)}
            </span>
          ))}
        </div>
      )}
      <h3 className="mb-3 border-b border-primary/30 pb-2 font-serif text-xl text-primary">
        Descrizione
      </h3>
      <HtmlText
        html={spell.descrizione}
        damageIcons
        references={references}
        spellReferences={spell.edizione === "2014" ? [] : inlineSpellReferences(spell.descrizione)}
      />
    </article>
  );
}

export function SpellEditor({ spell, onClose, edition }: { spell: Spell | null; onClose: () => void; edition: AdminEdition }) {
  const dialog = useRef<HTMLDialogElement>(null),
    form = useRef<HTMLFormElement>(null);
  const [description, setDescription] = useState(spell?.descrizione || "");
  const [preview, setPreview] = useState<Spell | null>(null);
  const [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  function showPreview() {
    if (!form.current?.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form.current).entries()) as Record<
      string,
      string
    >;
    setPreview({
      ...values,
      id: spell?.id || "unsaved-spell",
      edizione: values.edition || edition,
      ...parseLivello(values.livello),
    } as Spell);
    dialog.current?.scrollTo({ top: 0 });
  }
  async function save(data: FormData) {
    setSaving(true);
    setError("");
    try {
      const result = spell
        ? await updateSpellAction(null, data)
        : await createSpellAction(null, data);
      if (result?.ok) onClose();
      else setError(result?.error || "Salvataggio non riuscito. I campi sono conservati: riprova.");
    } catch {
      setError("Salvataggio non riuscito. I campi sono conservati: riprova.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby="spell-editor-heading"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
      className="fixed inset-0 m-auto max-h-[94dvh] w-[calc(100%-1rem)] max-w-3xl overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/80"
    >
      <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-card px-4 py-4 sm:px-6">
        <div>
          <h2 id="spell-editor-heading" className="font-serif text-2xl">
            {spell ? "Modifica incantesimo" : "Nuovo incantesimo"}
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Scegli le caratteristiche e scrivi gli effetti: il Grimorio prepara la scheda.
          </p>
          {spell?.da_file && (
            <p className="mt-1 text-xs leading-5 text-primary">
              Scheda dai file SRD: il primo salvataggio con una modifica la copia nel database. Ogni campo cambiato va nel Registro modifiche e si può annullare.
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
          if (confirmEditionMove(data, edition)) void save(data);
        }}
      >
        {spell && <input type="hidden" name="id" value={spell.id} />}
        <fieldset disabled={saving} className="min-w-0 p-4 sm:p-6">
          <div hidden={preview !== null} className="space-y-5">
            <AdminEditionField edition={edition} source={spell?.fonte} />
            <div>
              <label htmlFor="nome_italiano" className="mb-1.5 block text-sm text-muted-foreground">
                Nome *
              </label>
              <input
                id="nome_italiano"
                name="nome_italiano"
                required
                defaultValue={spell?.nome_italiano || ""}
                placeholder="Nome dell’incantesimo"
                className={inputClass}
              />
            </div>
            <SpellClassification initialValue={spell?.livello || ""} />
            <section className="space-y-4 rounded-xl border border-border p-4">
              <h3 className="font-serif text-xl text-primary">Lancio, gittata e durata</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {PRESETS.map((field) => (
                  <div key={field.name} className="min-w-0">
                    <label
                      htmlFor={field.name}
                      className="mb-1.5 block text-sm text-muted-foreground"
                    >
                      {field.label}
                    </label>
                    <AdminChoiceField {...field} initialValue={spell?.[field.name] || ""} />
                  </div>
                ))}
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Per reazioni con un innesco, aree o durate particolari, scegli «Valore
                personalizzato».
              </p>
            </section>
            <SpellComponents initialValue={spell?.componenti || ""} />
            <section className="space-y-3 rounded-xl border border-border p-4">
              <h3 className="font-serif text-xl text-primary">Descrizione</h3>
              <p className="text-xs leading-5 text-muted-foreground">
                Scrivi gli effetti in paragrafi. Puoi selezionare il testo per applicare grassetto o
                corsivo; i richiami alle condizioni saranno riconosciuti automaticamente per le
                schede 2024.
              </p>
              <input type="hidden" name="descrizione" value={description} />
              <AdminVisualText
                id="spell-description"
                label="Effetti e regole dell’incantesimo"
                initialHtml={spell?.descrizione || ""}
                onChange={setDescription}
              />
            </section>
          </div>
          {preview && (
            <div
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("a")) event.preventDefault();
              }}
            >
              <SpellPreview spell={preview} />
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
            <button
              type="submit"
              disabled={saving}
              className="min-h-11 flex-1 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Salvataggio…" : spell ? "Salva modifiche" : "Crea nel catalogo"}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
