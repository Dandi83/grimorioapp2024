"use client";

import { useId, useMemo, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";

import { formatNumber, levelForXp, splitXp, type ChallengeOption } from "@/lib/advancement";

interface Row { id: number; key: string; count: number }

const MIN_PARTY = 1, MAX_PARTY = 10, DEFAULT_PARTY = 4;

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      <button type="button" aria-label={`${label}: meno uno`} disabled={value <= min} onClick={() => onChange(value - 1)}
        className="grid size-12 place-items-center rounded-full border-2 border-primary bg-card text-primary disabled:border-border disabled:text-muted">
        <Minus size={22} aria-hidden="true" />
      </button>
      <output aria-live="polite" className="min-w-10 text-center font-serif text-[28px] font-bold tabular-nums">{value}</output>
      <button type="button" aria-label={`${label}: più uno`} disabled={value >= max} onClick={() => onChange(value + 1)}
        className="grid size-12 place-items-center rounded-full border-2 border-primary bg-primary text-primary-foreground disabled:border-border disabled:bg-card disabled:text-muted">
        <Plus size={22} aria-hidden="true" />
      </button>
    </div>
  );
}

/** Experience calculator: everything stays in the browser, nothing is saved. */
export function XpCalculator({ options }: { options: ChallengeOption[] }) {
  const idBase = useId();
  const firstKey = options.find(option => option.gs === 1)?.key ?? options[0]?.key ?? "";
  const [party, setParty] = useState(DEFAULT_PARTY);
  const [rows, setRows] = useState<Row[]>([{ id: 1, key: firstKey, count: 1 }]);
  const [owned, setOwned] = useState("");
  const byKey = useMemo(() => new Map(options.map(option => [option.key, option])), [options]);

  const total = rows.reduce((sum, row) => sum + (byKey.get(row.key)?.pe ?? 0) * row.count, 0);
  const { aTesta, resto } = splitXp(total, party);
  const ownedValue = owned.trim() === "" ? undefined : Number(owned.replace(/\./g, ""));
  const ownedValid = ownedValue !== undefined && Number.isFinite(ownedValue) && ownedValue >= 0;
  const after = ownedValid ? levelForXp(ownedValue + aTesta) : undefined;

  const update = (id: number, change: Partial<Row>) => setRows(list => list.map(row => (row.id === id ? { ...row, ...change } : row)));
  const reset = () => { setParty(DEFAULT_PARTY); setRows([{ id: Date.now(), key: firstKey, count: 1 }]); setOwned(""); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-border bg-card p-4">
        <span className="text-[17px] font-semibold">Personaggi</span>
        <Stepper label="Personaggi" value={party} min={MIN_PARTY} max={MAX_PARTY} onChange={setParty} />
      </div>

      <fieldset className="space-y-3 rounded-[14px] border border-border bg-card p-4">
        <legend className="px-1 font-serif text-xl font-bold text-primary">Mostri sconfitti</legend>
        {rows.map((row, index) => {
          const selectId = `${idBase}-gs-${row.id}`;
          return (
            <div key={row.id} className="space-y-2 border-b border-divider pb-3 last:border-b-0 last:pb-0">
              <div className="flex items-end gap-2">
                <label htmlFor={selectId} className="min-w-0 flex-1">
                  <span className="mb-1 block text-sm text-muted">Riga {index + 1}: grado sfida</span>
                  <select id={selectId} value={row.key} onChange={event => update(row.id, { key: event.target.value })}
                    className="min-h-12 w-full rounded-xl border border-border bg-background px-3 text-[17px]">
                    {options.map(option => <option key={option.key} value={option.key}>{option.label} · {formatNumber(option.pe)} PE</option>)}
                  </select>
                </label>
                {rows.length > 1 && (
                  <button type="button" aria-label={`Togli la riga ${index + 1}`} onClick={() => setRows(list => list.filter(item => item.id !== row.id))}
                    className="grid size-12 shrink-0 place-items-center rounded-xl border border-border text-muted">
                    <Trash2 size={20} aria-hidden="true" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[15px] text-muted">Quanti</span>
                <Stepper label={`Riga ${index + 1}, mostri`} value={row.count} min={1} max={99} onChange={count => update(row.id, { count })} />
              </div>
            </div>
          );
        })}
        <button type="button" onClick={() => setRows(list => [...list, { id: Date.now(), key: firstKey, count: 1 }])}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary text-[16px] font-bold text-primary">
          <Plus size={20} aria-hidden="true" /> Aggiungi riga
        </button>
      </fieldset>

      <label className="block rounded-[14px] border border-border bg-card p-4">
        <span className="mb-1 block text-[17px] font-semibold">PE già posseduti da ogni personaggio</span>
        <span className="mb-2 block text-sm text-muted">Facoltativo</span>
        <input inputMode="numeric" pattern="[0-9.]*" value={owned} onChange={event => setOwned(event.target.value)} placeholder="es. 2.700"
          className="min-h-12 w-full rounded-xl border border-border bg-background px-3 text-[17px] tabular-nums" />
      </label>

      <section aria-label="Risultato" aria-live="polite" className="space-y-2 rounded-[14px] border-2 border-primary bg-primary-faint p-4">
        <p className="flex items-baseline justify-between gap-3"><span className="text-[15px] text-muted">PE totali</span><span className="font-serif text-[26px] font-bold tabular-nums" data-testid="pe-totali">{formatNumber(total)}</span></p>
        <p className="flex items-baseline justify-between gap-3"><span className="text-[15px] text-muted">PE a testa</span><span className="font-serif text-[26px] font-bold tabular-nums text-primary" data-testid="pe-testa">{formatNumber(aTesta)}</span></p>
        {resto > 0 && <p className="text-sm text-muted">Arrotondato per difetto: restano {formatNumber(resto)} PE non divisibili tra {party} personaggi.</p>}
        {ownedValue !== undefined && !ownedValid && <p className="text-sm font-semibold text-primary">Scrivi i PE come numero, per esempio 2.700.</p>}
        {after && (
          <div className="space-y-1 border-t border-chip-border pt-2">
            <p className="flex items-baseline justify-between gap-3"><span className="text-[15px] text-muted">Nuovo totale a testa</span><span className="font-serif text-[22px] font-bold tabular-nums" data-testid="pe-nuovo">{formatNumber(ownedValue! + aTesta)}</span></p>
            <p className="flex items-baseline justify-between gap-3"><span className="text-[15px] text-muted">Livello raggiunto</span><span className="font-serif text-[22px] font-bold" data-testid="livello">{after.livello}º</span></p>
            <p className="text-[15px]" data-testid="mancanti">
              {after.mancanti !== undefined
                ? <>Mancano <strong>{formatNumber(after.mancanti)} PE</strong> al {after.livello + 1}º livello.</>
                : <>Livello massimo{after.talentiBonus > 0 ? <>: <strong>{after.talentiBonus} {after.talentiBonus === 1 ? "talento bonus" : "talenti bonus"}</strong> (regola 2024)</> : null}.</>}
            </p>
          </div>
        )}
      </section>

      <button type="button" onClick={reset} className="min-h-12 w-full rounded-xl border border-border bg-card text-[16px] font-bold text-foreground">Azzera</button>
    </div>
  );
}
