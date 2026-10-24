"use client";

import { useRef, useState, type ReactNode } from "react";
import { Eye, Pencil, X } from "lucide-react";
import { createSpellAction, updateSpellAction } from "@/app/actions/admin";
import { parseLivello, type Spell } from "@/lib/spells-types";
import { spellName } from "@/lib/spell-name";
import { AdminChoiceField } from "./admin-choice-field";
import { AdminVisualText } from "./admin-visual-text";
import { SpellClassification, SpellComponents } from "./admin-spell-fields";
import { AdminEditionField, confirmEditionMove } from "./admin-edition-field";
import type { AdminEdition } from "@/lib/admin-edition";
import { SpellSheetBody, SpellSheetHeading } from "./spell-sheet";
import { useCardDisplay } from "./card-display-context";
import { EyeButton } from "./admin-card-eye";
import { HiddenTag } from "./sections/hidden-tag";
import { useEditorFrame } from "./admin-editor-frame";

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

/** The editor preview: the same sheet as the public page (components/spell-sheet.tsx), with the same links and labels. */
function SpellPreview({ spell }: { spell: Spell }) {
  const context = useCardDisplay();
  return (
    <article className="spell-sheet min-w-0 rounded-xl border border-primary/20 bg-background pt-5">
      <div className="px-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Anteprima · non ancora salvata</p>
        <SpellSheetHeading spell={spell} context={context} heading="h2" />
      </div>
      <SpellSheetBody spell={spell} context={context} />
    </article>
  );
}

/**
 * visibility: the eye of the list, also at the top of the editor (cards already saved), with its notice.
 * page: the editor is the page («Modifica» on the public card), not a dialog over the list.
 */
export function SpellEditor({ spell, onClose, edition, visibility, page = false }: {
  spell: Spell | null;
  onClose: () => void;
  edition: AdminEdition;
  visibility?: { hidden: boolean; onToggle: () => void; notice?: ReactNode };
  page?: boolean;
}) {
  const { dialog, heading, frame, header, toTop } = useEditorFrame(page);
  const form = useRef<HTMLFormElement>(null);
  const [description, setDescription] = useState(spell?.descrizione || "");
  const [preview, setPreview] = useState<Spell | null>(null);
  const [saving, setSaving] = useState(false),
    [error, setError] = useState("");
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
      // The label of the card: a new card is «Aggiunta da te», the others keep theirs.
      fonte_scheda: spell ? spell.fonte_scheda : "Aggiunta da te",
    } as Spell);
    toTop();
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
      open={page || undefined}
      aria-labelledby="spell-editor-heading"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
      className={`${frame} bg-card`}
    >
      <header className={`${header} flex items-start justify-between gap-3 border-b border-border bg-card px-4 py-4 sm:px-6`}>
        <div>
          <h2 ref={heading} tabIndex={-1} id="spell-editor-heading" className="font-serif text-2xl outline-none">
            {spell ? "Modifica incantesimo" : "Nuovo incantesimo"}
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Scegli le caratteristiche e scrivi gli effetti: il Grimorio prepara la scheda.
          </p>
          {visibility?.hidden && <p className="mt-1 text-xs text-muted-foreground"><HiddenTag /> Il pubblico non vede questa scheda.</p>}
        </div>
        <div className="flex shrink-0 items-center">
          {visibility && spell && <EyeButton hidden={visibility.hidden} nome={spell.nome_mostrato ?? spellName(spell.nome_italiano, spell.edizione)} onToggle={visibility.onToggle} />}
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            aria-label="Chiudi editor"
            className="min-h-11 min-w-11 rounded-lg text-muted-foreground hover:bg-elevated"
          >
            <X className="mx-auto h-5 w-5" aria-hidden />
          </button>
        </div>
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
      {visibility?.notice}
    </dialog>
  );
}
