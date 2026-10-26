"use client";

import { useMemo, useState } from "react";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";

import reference from "@/lib/data/gs-riferimento.json";
import { HABITATS } from "@/lib/habitats";
import { estimateChallenge, statsOf, VERDICT_LABEL, type CrReference } from "@/lib/homebrew-cr";
import {
  ABILITY_KEYS, ABILITY_SHORT, BLOCK_LABEL, CHALLENGE_RATINGS, HOMEBREW_ALIGNMENTS, HOMEBREW_EDITION_LABEL, HOMEBREW_EDITIONS, HOMEBREW_TYPES, LIMITS,
  blocksOf, draftActionText, draftToMonster, formatWords, mismatchedFormat, modifier, proficiency, type EntryBlock, type HomebrewDraft, type HomebrewEdition,
} from "@/lib/homebrew-types";
import { SIZES } from "@/lib/monsters-types";
import { MonsterSheetBody, MonsterSheetTitle } from "@/components/monster-sheet";
import { useCardDisplay } from "@/components/card-display-context";
import { BothEditionsPill, HomebrewPill } from "@/components/homebrew-pill";
import { MonsterProvenanceBadge } from "@/components/monster-provenance-badge";

const inputClass = "w-full min-w-0 rounded-lg border border-border bg-card px-3 py-2.5 text-base text-foreground outline-none focus:border-primary";
const labelClass = "mb-1.5 block text-sm font-semibold text-foreground";

/** One line under the edition buttons: what changes on the sheet. */
const EDITION_HINT: Record<HomebrewEdition, string> = {
  "2024": "Formato 2024: Iniziativa in scheda, tiri salvezza di tutte e sei le caratteristiche, effetti con «Fallimento» e «Successo».",
  "2014": "Formato 2014: tiri salvezza su una riga a parte, solo dove la creatura è competente; attacchi «Attacco con arma da mischia»; nessuna Iniziativa scritta (la scheda la ricava dalla Destrezza, come per le creature 2014).",
  entrambe: "Compare nel Bestiario 2014 e 2024, con la scheda nel formato 2024.",
};

const PLACEHOLDER: Partial<Record<EntryBlock, { nome: string; testo: Record<"2014" | "2024", string> }>> = {
  azioni: {
    nome: "Es. Morso",
    testo: {
      "2024": "Tiro per colpire in mischia: +5, portata 1,5 m. Colpito: 9 (2d6 + 2) danni perforanti.",
      "2014": "Attacco con arma da mischia: +5 al tiro per colpire, portata 1,5 m, un bersaglio. Colpito: 9 (2d6 + 2) danni perforanti.",
    },
  },
  tratti: { nome: "Es. Anfibio", testo: { "2024": "La creatura può respirare aria e acqua.", "2014": "La creatura può respirare aria e acqua." } },
};

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[14px] border-[1.5px] border-border bg-card p-4">
      <h2 className="font-serif text-xl font-bold text-primary">{title}</h2>
      {hint && <p className="mt-0.5 text-[13px] leading-5 text-muted">{hint}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function Text({ id, label, value, onChange, max = LIMITS.short, placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; max?: number; placeholder?: string }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={labelClass}>{label}</label>
      <input id={id} value={value} maxLength={max} placeholder={placeholder} onChange={event => onChange(event.target.value)} className={inputClass} />
    </div>
  );
}

function Choice({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={labelClass}>{label}</label>
      <select id={id} value={value} onChange={event => onChange(event.target.value)} className={inputClass}>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

function NumberField({ id, label, value, min, max, onChange }: { id: string; label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={labelClass}>{label}</label>
      <input id={id} type="number" inputMode="numeric" min={min} max={max} value={Number.isFinite(value) ? value : ""}
        onChange={event => onChange(event.target.value === "" ? NaN : Number(event.target.value))} className={inputClass} />
    </div>
  );
}

/**
 * The guided editor of a homebrew creature: the fields the creature sheet can show, adapted to the chosen
 * edition, with the format hint and the challenge check. Used by /bestiario/proponi and by the admin area.
 */
export function HomebrewEditor({ value, onChange, idPrefix = "hb" }: { value: HomebrewDraft; onChange: (draft: HomebrewDraft) => void; idPrefix?: string }) {
  const [preview, setPreview] = useState(false);
  const set = <K extends keyof HomebrewDraft>(key: K, next: HomebrewDraft[K]) => onChange({ ...value, [key]: next });
  const id = (name: string) => `${idPrefix}-${name}`;
  const format = value.edizione === "2014" ? "2014" : "2024";
  const text = useMemo(() => draftActionText(value), [value]);
  const mismatch = mismatchedFormat({ edizione: value.edizione, text });
  const sheet = useMemo(() => draftToMonster(value, "anteprima"), [value]);
  // The preview links as the public sheet will (lib/card-display.ts), with the catalog set by the page.
  const display = useCardDisplay();
  const check = useMemo(() => {
    if (!(value.pf > 0) || !(value.ca > 0)) return null;
    return estimateChallenge(statsOf(sheet), reference as CrReference);
  }, [sheet, value.pf, value.ca]);
  const dex = Number.isFinite(value.destrezza) ? Math.floor((value.destrezza - 10) / 2) : 0;

  const updateEntry = (block: EntryBlock, index: number, field: "nome" | "testo", next: string) =>
    set(block, value[block].map((entry, i) => (i === index ? { ...entry, [field]: next } : entry)));

  return (
    <div className="space-y-4">
      <Section title="Edizione">
        <div role="group" aria-label="Edizione della scheda" className="grid grid-cols-3 gap-1 rounded-[10px] border border-border bg-elevated p-1">
          {HOMEBREW_EDITIONS.map(edition => (
            <button key={edition} type="button" aria-pressed={value.edizione === edition} onClick={() => set("edizione", edition)}
              className={`min-h-11 rounded-[8px] text-[15px] font-bold ${value.edizione === edition ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
              {HOMEBREW_EDITION_LABEL[edition]}
            </button>
          ))}
        </div>
        <p className="text-[13px] leading-5 text-muted" data-edition-hint="">{EDITION_HINT[value.edizione]}</p>
      </Section>

      {mismatch && (
        <div role="note" className="rounded-[14px] border-[1.5px] border-[#2D4C7A] bg-[#E8EEF7] p-4 text-[15px] leading-6 text-[#1E3557]" data-format-hint="">
          <p>Nelle azioni hai scritto {formatWords(text, mismatch).map(word => `«${word}»`).join(", ")}: è il formato del {mismatch}. {mismatch === "2024" ? "Vuoi passare al 2024 o a Entrambe?" : "Vuoi passare al 2014?"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(mismatch === "2024" ? (["2024", "entrambe"] as const) : (["2014"] as const)).map(edition => (
              <button key={edition} type="button" onClick={() => set("edizione", edition)} className="min-h-11 rounded-[8px] bg-[#2D4C7A] px-4 text-[15px] font-bold text-white">
                Passa a {HOMEBREW_EDITION_LABEL[edition]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={() => setPreview(open => !open)} className="flex min-h-11 items-center gap-2 rounded-[8px] border border-border bg-card px-4 text-[15px] font-semibold">
          {preview ? <Pencil size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}{preview ? "Torna al modulo" : "Anteprima della scheda"}
        </button>
      </div>

      {preview ? (
        <article className="monster-sheet min-w-0 rounded-xl border border-primary/20 bg-background py-5" aria-label="Anteprima della scheda">
          <MonsterSheetTitle monster={sheet} label={
            <span className="flex flex-wrap items-center justify-end gap-1.5"><HomebrewPill />{value.edizione === "entrambe" ? <BothEditionsPill /> : <MonsterProvenanceBadge edition={format} variant="dark" />}</span>
          } />
          <MonsterSheetBody monster={{ ...sheet, fonte_scheda: "Homebrew" }} legacy={value.edizione === "2014"} catalog={display.catalog} hidden={display.hidden} />
        </article>
      ) : (
        <>
          <Section title="Identità">
            <Text id={id("nome")} label="Nome *" value={value.nome} max={LIMITS.nome} onChange={next => set("nome", next)} placeholder="Es. Guardiano delle rovine" />
            <div className="grid gap-3 sm:grid-cols-3">
              <Choice id={id("taglia")} label="Taglia" value={value.taglia} options={SIZES} onChange={next => set("taglia", next)} />
              <Choice id={id("tipo")} label="Tipo" value={value.tipo} options={HOMEBREW_TYPES} onChange={next => set("tipo", next)} />
              <Choice id={id("allineamento")} label="Allineamento" value={value.allineamento} options={HOMEBREW_ALIGNMENTS} onChange={next => set("allineamento", next)} />
            </div>
          </Section>

          <Section title="Combattimento">
            <div className="grid grid-cols-2 gap-3">
              <NumberField id={id("ca")} label="Classe armatura" value={value.ca} min={1} max={30} onChange={next => set("ca", next)} />
              <Text id={id("ca-nota")} label="Nota della CA" value={value.ca_nota} onChange={next => set("ca_nota", next)} placeholder="Es. armatura naturale" />
              <NumberField id={id("pf")} label="Punti ferita" value={value.pf} min={1} max={999} onChange={next => set("pf", next)} />
              <Text id={id("dadi")} label="Dadi vita" value={value.dadi_vita} max={20} onChange={next => set("dadi_vita", next)} placeholder="Es. 6d8 + 18" />
            </div>
            <Text id={id("velocita")} label="Velocità" value={value.velocita} onChange={next => set("velocita", next)} placeholder="Es. 9 m, volo 18 m" />
            <div className="grid grid-cols-2 gap-3">
              <Choice id={id("gs")} label="Grado di sfida" value={value.grado_sfida} options={CHALLENGE_RATINGS} onChange={next => set("grado_sfida", next)} />
              {format === "2024" && (
                <div className="min-w-0" aria-live="polite">
                  <p className={labelClass}>Iniziativa</p>
                  <p className="flex min-h-[46px] items-center rounded-lg border border-dashed border-border px-3 text-base" data-initiative="">
                    {dex >= 0 ? `+${dex}` : dex} ({10 + dex}) · dalla Destrezza
                  </p>
                </div>
              )}
            </div>
            <p className="text-[13px] text-muted">Bonus di competenza +{proficiency(value.grado_sfida)} (dal grado di sfida). Punti esperienza dal grado di sfida.</p>
          </Section>

          <Section title="Caratteristiche" hint="Punteggi da 1 a 30: i modificatori sono automatici. Spunta «TS» dove la creatura è competente nel tiro salvezza.">
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
              {ABILITY_KEYS.map(key => (
                <div key={key} className="min-w-0 rounded-[10px] border border-border bg-background p-2 text-center">
                  <label htmlFor={id(key)} className="block text-[12px] font-bold uppercase tracking-[0.08em] text-muted">{ABILITY_SHORT[key]}</label>
                  <input id={id(key)} type="number" inputMode="numeric" min={1} max={30} value={Number.isFinite(value[key]) ? value[key] : ""}
                    onChange={event => set(key, event.target.value === "" ? NaN : Number(event.target.value))} className={`${inputClass} px-1 text-center`} />
                  <p className="mt-1 text-[13px] font-semibold text-primary">{Number.isFinite(value[key]) ? modifier(value[key]) : "—"}</p>
                  <label className="mt-1 flex min-h-11 items-center justify-center gap-1.5 text-[13px]">
                    <input type="checkbox" checked={value.ts_competenti.includes(key)} className="size-5 accent-[#7A1F2B]"
                      onChange={event => set("ts_competenti", ABILITY_KEYS.filter(k => (k === key ? event.target.checked : value.ts_competenti.includes(k))))} />
                    TS
                  </label>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Abilità, difese e sensi" hint="Facoltativi. La Percezione passiva è calcolata dalla Saggezza (o dalla Percezione scritta nelle abilità).">
            <Text id={id("abilita")} label="Abilità" value={value.abilita} onChange={next => set("abilita", next)} placeholder="Es. Percezione +4, Furtività +6" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Text id={id("vulnerabilita")} label="Vulnerabilità" value={value.vulnerabilita} onChange={next => set("vulnerabilita", next)} placeholder="Es. fuoco" />
              <Text id={id("resistenze")} label="Resistenze" value={value.resistenze} onChange={next => set("resistenze", next)} placeholder="Es. freddo, fulmine" />
              <Text id={id("immunita-danni")} label="Immunità ai danni" value={value.immunita_danni} onChange={next => set("immunita_danni", next)} placeholder="Es. veleno" />
              <Text id={id("immunita-condizioni")} label="Immunità alle condizioni" value={value.immunita_condizioni} onChange={next => set("immunita_condizioni", next)} placeholder="Es. avvelenato" />
            </div>
            <Text id={id("sensi")} label="Sensi speciali" value={value.sensi} onChange={next => set("sensi", next)} placeholder="Es. scurovisione 18 m" />
            <Text id={id("linguaggi")} label="Linguaggi" value={value.linguaggi} onChange={next => set("linguaggi", next)} placeholder="Es. Comune, Draconico" />
            <fieldset>
              <legend className={labelClass}>Habitat</legend>
              <div className="flex flex-wrap gap-2">
                {HABITATS.map(habitat => (
                  <label key={habitat} className={`flex min-h-11 items-center gap-1.5 rounded-[22px] border-[1.5px] px-3 text-sm ${value.habitat.includes(habitat) ? "border-primary bg-primary-faint font-semibold text-primary" : "border-chip-border bg-card"}`}>
                    <input type="checkbox" className="sr-only" checked={value.habitat.includes(habitat)}
                      onChange={event => set("habitat", HABITATS.filter(h => (h === habitat ? event.target.checked : value.habitat.includes(h))))} />
                    {habitat}
                  </label>
                ))}
              </div>
            </fieldset>
          </Section>

          {blocksOf(value.edizione).map(block => (
            <Section key={block} title={BLOCK_LABEL[block].title} hint={block === "azioni_leggendarie" ? "Lascia vuoto il nome della prima voce per l’introduzione (quante azioni a round)." : undefined}>
              {value[block].map((entry, index) => (
                <div key={index} className="space-y-2 rounded-[10px] border border-primary/20 bg-background p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-bold uppercase tracking-wide text-muted">{BLOCK_LABEL[block].singular} {index + 1}</p>
                    <button type="button" aria-label={`Rimuovi ${BLOCK_LABEL[block].singular.toLowerCase()} ${index + 1}`} onClick={() => set(block, value[block].filter((_, i) => i !== index))}
                      className="grid size-11 place-items-center rounded-lg text-muted hover:text-destructive">
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                  <Text id={id(`${block}-${index}-nome`)} label="Nome" value={entry.nome} max={LIMITS.entryName} onChange={next => updateEntry(block, index, "nome", next)} placeholder={PLACEHOLDER[block]?.nome} />
                  <div>
                    <label htmlFor={id(`${block}-${index}-testo`)} className={labelClass}>Descrizione</label>
                    <textarea id={id(`${block}-${index}-testo`)} value={entry.testo} maxLength={LIMITS.entryText} rows={3} onChange={event => updateEntry(block, index, "testo", event.target.value)}
                      placeholder={PLACEHOLDER[block]?.testo[format]} className={`${inputClass} min-h-24`} />
                  </div>
                </div>
              ))}
              {value[block].length < LIMITS.entries && (
                <button type="button" onClick={() => set(block, [...value[block], { nome: "", testo: "" }])}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[8px] border border-dashed border-primary/40 text-[15px] font-semibold text-primary">
                  <Plus size={16} aria-hidden="true" />Aggiungi {BLOCK_LABEL[block].singular.toLowerCase()}
                </button>
              )}
            </Section>
          ))}
        </>
      )}

      {check && <ChallengeCheck check={check} declared={value.grado_sfida} />}
    </div>
  );
}

/** The challenge check: defence, attack and estimate in three boxes, then the verdict. Only a notice, never blocking. */
export function ChallengeCheck({ check, declared }: { check: ReturnType<typeof estimateChallenge>; declared: string }) {
  return (
    <section aria-label="Controllo del grado di sfida" className="rounded-[14px] border-[1.5px] border-[#2D4C7A] bg-[#E8EEF7] p-4 text-[#1E3557]" data-cr-check={check.esito}>
      <h2 className="font-serif text-xl font-bold">Controllo del grado di sfida</h2>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {([["GS Difesa", check.difesa], ["GS Attacco", check.attacco], ["GS stimato", check.stimato]] as const).map(([label, gs]) => (
          <div key={label} className="rounded-[10px] border border-[#2D4C7A]/40 bg-white/70 px-1 py-2">
            <p className="text-[12px] font-bold uppercase tracking-[0.06em]">{label}</p>
            <p className="font-serif text-[26px] font-bold leading-8">{gs}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[15px] leading-6"><b>{VERDICT_LABEL[check.esito]}</b> rispetto al GS {declared} indicato. {check.spiegazione}</p>
      <p className="mt-1 text-[12px] leading-5 opacity-80">Stima dalle creature SRD del Grimorio: è solo un avviso, puoi inviare comunque.</p>
    </section>
  );
}
