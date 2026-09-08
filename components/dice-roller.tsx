"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Dices, RotateCcw } from "lucide-react";
import { Die3D } from "@/components/die-3d";

type DieSides = 4 | 6 | 8 | 10 | 12 | 20 | 100;

const DICE: DieSides[] = [4, 6, 8, 10, 12, 20, 100];
const COUNT_PRESETS = [1, 2, 3, 4, 5, 6, 8, 10];

interface RollEntry {
  id: string;
  sides: DieSides;
  count: number;
  values: number[];
  sum: number;
  timestamp: number;
}

function rollDie(sides: DieSides): number {
  return Math.floor(Math.random() * sides) + 1;
}

export function DiceRoller() {
  const [selected, setSelected] = useState<DieSides>(20);
  const [count, setCount] = useState(1);
  const [currentValues, setCurrentValues] = useState<number[]>([]);
  const [history, setHistory] = useState<RollEntry[]>([]);
  const [rolling, setRolling] = useState(false);
  const [nonce, setNonce] = useState(0);
  const runRef = useRef(0);

  const sum = useMemo(
    () => currentValues.reduce((a, b) => a + b, 0),
    [currentValues],
  );

  const roll = useCallback(() => {
    if (rolling) return;
    setRolling(true);
    runRef.current += 1;
    const myRun = runRef.current;

    const shuffle = setInterval(() => {
      setCurrentValues(Array.from({ length: count }, () => rollDie(selected)));
    }, 65);

    setTimeout(() => {
      clearInterval(shuffle);
      if (myRun !== runRef.current) return;
      const values = Array.from({ length: count }, () => rollDie(selected));
      setCurrentValues(values);
      setNonce((n) => n + 1);
      setHistory((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          sides: selected,
          count,
          values,
          sum: values.reduce((a, b) => a + b, 0),
          timestamp: Date.now(),
        },
        ...prev.slice(0, 19),
      ]);
      setRolling(false);
    }, 750);
  }, [count, rolling, selected]);

  const hasResult = currentValues.length > 0;
  const isMulti = count > 1;

  const critMessage = (() => {
    if (currentValues.length !== 1 || rolling) return null;
    const v = currentValues[0];
    if (selected === 20 && v === 20) return "Successo Critico!";
    if (selected === 20 && v === 1) return "Fallimento Critico";
    if (v === selected) return "Massimo!";
    if (v === 1 && selected !== 4) return "Minimo";
    return null;
  })();

  const isCritLow =
    currentValues.length === 1 && selected === 20 && currentValues[0] === 1;

  // Valore mostrato al centro del medaglione: il singolo dado, oppure la somma.
  const centerValue = rolling
    ? isMulti
      ? sum
      : (currentValues[0] ?? 0)
    : hasResult
      ? isMulti
        ? sum
        : currentValues[0]
      : null;

  const reset = () => setCurrentValues([]);

  return (
    <div className="pb-8">
      <header className="px-6 pb-2 pt-6">
        <h1 className="font-serif text-3xl font-bold text-foreground">Dadi</h1>
        <p className="mt-1 text-[13px] tracking-wide text-muted">
          Scegli il dado, la quantità e lancia
        </p>
      </header>

      {/* Scena dado 3D */}
      <div className="px-6 pt-4">
        <div className="dice-scene relative mx-auto flex aspect-square w-full max-w-[280px] items-center justify-center">
          {/* Bagliore ambientale */}
          <div
            className="absolute inset-6 rounded-full blur-3xl transition-opacity duration-500"
            style={{
              background:
                "radial-gradient(circle, rgba(212,175,55,0.30), transparent 70%)",
              opacity: hasResult || rolling ? 1 : 0.35,
            }}
          />

          {/* Il dado poliedrico */}
          <div
            key={nonce}
            className={
              rolling
                ? "animate-dice-tumble"
                : hasResult
                  ? "animate-dice-settle"
                  : "animate-dice-float"
            }
          >
            <Die3D
              sides={selected}
              value={
                centerValue === null
                  ? null
                  : (centerValue as number)
              }
              size={220}
            />
          </div>

          {/* Etichetta tipo/totale sotto il dado */}
          <span className="absolute bottom-0 text-[11px] font-bold uppercase tracking-[0.3em] text-muted">
            {centerValue === null
              ? "Pronto"
              : isMulti
                ? `${count}d${selected} · totale`
                : `d${selected}`}
          </span>
        </div>

        {/* Messaggio critico */}
        <div className="mt-3 flex h-6 items-center justify-center">
          {critMessage && (
            <p
              className={`font-serif text-base italic ${
                isCritLow ? "text-destructive-foreground" : "text-primary"
              }`}
            >
              {critMessage}
            </p>
          )}
        </div>

        {/* Valori singoli (multi-dado) */}
        {isMulti && hasResult && !rolling && (
          <div className="no-scrollbar mt-1 flex flex-wrap justify-center gap-2">
            {currentValues.map((v, i) => (
              <span
                key={i}
                className="flex h-10 min-w-[40px] items-center justify-center rounded-lg border border-primary-dim/50 bg-primary-faint px-2.5 font-serif text-lg font-bold text-primary"
              >
                {v}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Pulsante lancia */}
      <div className="mt-6 flex items-center gap-3 px-6">
        <button
          type="button"
          onClick={roll}
          disabled={rolling}
          className="flex h-14 flex-1 items-center justify-center gap-2.5 rounded-full bg-primary text-base font-bold tracking-wide text-primary-foreground shadow-lg shadow-primary/25 transition-opacity active:opacity-80 disabled:opacity-70"
        >
          <Dices size={22} className={rolling ? "animate-spin" : ""} />
          {rolling ? "Lancio..." : `Lancia ${count}d${selected}`}
        </button>
        {hasResult && !rolling && (
          <button
            type="button"
            onClick={reset}
            aria-label="Azzera"
            className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card text-muted transition-colors active:bg-elevated"
          >
            <RotateCcw size={20} />
          </button>
        )}
      </div>

      {/* Selettore tipo dado */}
      <p className="mb-3 mt-8 px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-primary">
        Tipo di dado
      </p>
      <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-6">
        {DICE.map((sides) => {
          const active = selected === sides;
          return (
            <button
              key={sides}
              type="button"
              onClick={() => {
                setSelected(sides);
                reset();
              }}
              className={`flex h-16 min-w-[64px] flex-shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border transition-colors ${
                active
                  ? "border-primary bg-primary-faint"
                  : "border-border bg-card"
              }`}
            >
              <span
                className={`font-serif text-xl font-bold leading-none ${
                  active ? "text-primary" : "text-card-foreground"
                }`}
              >
                d{sides}
              </span>
              <span
                className={`text-[9px] uppercase tracking-wider ${
                  active ? "text-primary-dim" : "text-muted"
                }`}
              >
                {sides} facce
              </span>
            </button>
          );
        })}
      </div>

      {/* Selettore quantità */}
      <p className="mb-3 mt-7 px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-primary">
        Quanti dadi
      </p>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-6">
        {COUNT_PRESETS.map((n) => {
          const active = count === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => {
                setCount(n);
                reset();
              }}
              className={`flex h-11 min-w-[52px] flex-shrink-0 items-center justify-center rounded-full border px-3 text-sm font-semibold transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-card-foreground"
              }`}
            >
              {n}d
            </button>
          );
        })}
      </div>

      {/* Cronologia */}
      <div className="mb-3 mt-8 flex items-center justify-between px-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary">
          Cronologia
        </p>
        {history.length > 0 && (
          <button
            type="button"
            onClick={() => setHistory([])}
            className="text-xs font-semibold text-muted underline"
          >
            Pulisci
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="px-6 font-serif text-sm italic text-muted">
          I tuoi lanci appariranno qui.
        </p>
      ) : (
        <div className="flex flex-col gap-2 px-6">
          {history.map((h) => {
            const critHigh = h.count === 1 && h.sides === 20 && h.sum === 20;
            const critLow = h.count === 1 && h.sides === 20 && h.sum === 1;
            return (
              <div
                key={h.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-elevated font-serif text-sm font-bold text-primary">
                  d{h.sides}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-base font-semibold text-foreground">
                    {h.count}d{h.sides}
                  </p>
                  <p className="truncate text-[11px] text-muted">
                    {h.count > 1 && h.values.length <= 12
                      ? `${h.values.join(" + ")}  ·  `
                      : ""}
                    {new Date(h.timestamp).toLocaleTimeString("it-IT", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span
                  className={`min-w-[48px] text-right font-serif text-2xl font-bold ${
                    critHigh
                      ? "text-primary"
                      : critLow
                        ? "text-destructive-foreground"
                        : "text-foreground"
                  }`}
                >
                  {h.sum}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
