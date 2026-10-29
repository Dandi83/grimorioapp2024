"use client";

import { Check, Plus, Trash2 } from "lucide-react";

import {
  SENSE_DISTANCES, SENSES, readChips, readLanguages, readSenses, toggleChip, writeChips, writeLanguages, writeSenses,
} from "@/lib/homebrew-fields";

const labelClass = "mb-1.5 block text-sm font-semibold text-foreground";
const inputClass = "w-full min-w-0 rounded-lg border border-border bg-card px-3 py-2.5 text-base text-foreground outline-none focus:border-primary";

/** One chip: a tap chooses or removes it; chosen, it shows ✓ and the bordeaux border. */
function Chip({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={onToggle} data-chip={label}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-[22px] border-[1.5px] px-3.5 text-[15px] ${on ? "border-[#7A1F2B] bg-primary-faint font-semibold text-[#7A1F2B]" : "border-chip-border bg-card text-foreground"}`}>
      {on && <Check size={15} strokeWidth={2.6} aria-hidden="true" />}{label}
    </button>
  );
}

/** The rest of an older text written by hand: kept as it is, and still editable. */
function Rest({ id, value, onChange, label = "Scritto a mano" }: { id: string; value: string; onChange: (value: string) => void; label?: string }) {
  return (
    <div className="mt-2">
      <label htmlFor={id} className="mb-1 block text-[13px] font-semibold text-muted">{label}</label>
      <input id={id} value={value} maxLength={160} onChange={event => onChange(event.target.value)} className={inputClass} />
    </div>
  );
}

/** Damage types or conditions: several chips, saved as «freddo, necrotico». */
export function ChipField({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: readonly string[]; onChange: (text: string) => void }) {
  const list = readChips(value, options);
  return (
    <fieldset className="min-w-0" data-chip-field={id}>
      <legend className={labelClass}>{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(option => (
          <Chip key={option} label={option} on={list.selected.includes(option)}
            onToggle={() => onChange(writeChips(toggleChip(list, option), options))} />
        ))}
      </div>
      {list.extra && <Rest id={`${id}-resto`} value={list.extra} onChange={extra => onChange(writeChips({ ...list, extra }, options))} />}
    </fieldset>
  );
}

/** Languages: the chips of the edition, «altra» (free) and «Capisce ma non può parlare». */
export function LanguagesField({ id, value, options, onChange }: { id: string; value: string; options: readonly string[]; onChange: (text: string) => void }) {
  const list = readLanguages(value, options);
  const write = (next: typeof list) => onChange(writeLanguages(next, options));
  return (
    <fieldset className="min-w-0" data-chip-field={id}>
      <legend className={labelClass}>Linguaggi</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(option => <Chip key={option} label={option} on={list.selected.includes(option)} onToggle={() => write({ ...list, ...toggleChip(list, option) })} />)}
      </div>
      <Rest id={`${id}-altra`} label="Altra (scrivila tu, es. telepatia 36 m)" value={list.extra} onChange={extra => write({ ...list, extra })} />
      <label className="mt-2 flex min-h-11 items-center gap-3 text-[15px]">
        <input type="checkbox" checked={list.understandsOnly} onChange={event => write({ ...list, understandsOnly: event.target.checked })} className="size-5 shrink-0 accent-[#7A1F2B]" />
        Capisce ma non può parlare
      </label>
    </fieldset>
  );
}

/** Senses: one row per sense (type and distance), «+ Aggiungi un senso»; the passive Perception is computed by itself. */
export function SensesField({ id, value, passive, onChange }: { id: string; value: string; passive: number; onChange: (text: string) => void }) {
  const senses = readSenses(value);
  const write = (next: typeof senses) => onChange(writeSenses(next));
  const free = SENSES.filter(sense => !senses.rows.some(row => row.sense === sense));
  return (
    <fieldset className="min-w-0" data-senses-field={id}>
      <legend className={labelClass}>Sensi</legend>
      <div className="space-y-2">
        {senses.rows.map((row, index) => (
          <div key={`${row.sense}-${index}`} className="grid grid-cols-[minmax(0,1fr)_96px_44px] items-center gap-2" data-sense-row={row.sense}>
            <select aria-label={`Senso ${index + 1}`} value={row.sense} className={inputClass}
              onChange={event => write({ ...senses, rows: senses.rows.map((other, i) => (i === index ? { ...other, sense: event.target.value } : other)) })}>
              {[row.sense, ...free].map(sense => <option key={sense} value={sense}>{sense}</option>)}
            </select>
            <select aria-label={`Distanza di ${row.sense}`} value={row.metres} className={inputClass}
              onChange={event => write({ ...senses, rows: senses.rows.map((other, i) => (i === index ? { ...other, metres: Number(event.target.value) } : other)) })}>
              {[...new Set([...SENSE_DISTANCES, row.metres])].sort((a, b) => a - b).map(metres => <option key={metres} value={metres}>{metres} m</option>)}
            </select>
            <button type="button" aria-label={`Togli ${row.sense}`} onClick={() => write({ ...senses, rows: senses.rows.filter((_, i) => i !== index) })}
              className="grid size-11 place-items-center rounded-lg text-muted hover:text-destructive">
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      {free.length > 0 && (
        <button type="button" onClick={() => write({ ...senses, rows: [...senses.rows, { sense: free[0], metres: 18 }] })} data-add-sense=""
          className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-[8px] border border-dashed border-primary/40 text-[15px] font-semibold text-primary">
          <Plus size={16} aria-hidden="true" />Aggiungi un senso
        </button>
      )}
      {senses.extra && <Rest id={`${id}-resto`} value={senses.extra} onChange={extra => write({ ...senses, extra })} />}
      <p className="mt-2 flex min-h-11 items-center rounded-lg border border-dashed border-border px-3 text-[15px]" data-passive-perception="">
        Percezione passiva {passive} · calcolata da sola
      </p>
    </fieldset>
  );
}
