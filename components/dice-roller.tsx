"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

import { DieShape, type DieSides } from "@/components/die-shape";

const DICE: { sides: DieSides; label: string }[] = [
  { sides: 20, label: "d20" },
  { sides: 12, label: "d12" },
  { sides: 10, label: "d10" },
  { sides: 8, label: "d8" },
  { sides: 6, label: "d6" },
  { sides: 4, label: "d4" },
  { sides: 100, label: "d100" },
];

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
  const [rotation, setRotation] = useState(0);
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

    setRotation((r) => r + 360 + Math.floor(Math.random() * 360));

    const shuffle = setInterval(() => {
      setCurrentValues(Array.from({ length: count }, () => rollDie(selected)));
    }, 70);

    setTimeout(() => {
      clearInterval(shuffle);
      if (myRun !== runRef.current) return;
      const values = Array.from({ length: count }, () => rollDie(selected));
      setCurrentValues(values);
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
    }, 800);
  }, [count, rolling, selected]);

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

  const reset = () => {
    setCurrentValues([]);
  };

  return (
    <div className="pb-8">
      <header className="px-6 pb-4 pt-6">
        <h1 className="font-serif text-3xl font-bold text-foreground">Dadi</h1>
        <p className="mt-1 text-[13px] tracking-wide text-muted">
          Scegli dado, quantità, e lancia
        </p>
      </header>

      {/* Stage */}
      <div className="mx-6 mb-4 flex min-h-[340px] flex-col items-center justify-center rounded-2xl border border-border bg-card py-6">
        <div
          className="flex items-center justify-center transition-transform duration-700 ease-out"
          style={{ transform: `rotate(${rotation}deg) scale(${rolling ? 1.1 : 1})` }}
        >
          <DieShape
            sides={selected}
            size={200}
            value={
              currentValues.length === 1 && !rolling ? currentValues[0] : undefined
            }
          />
        </div>

        {currentValues.length > 1 && !rolling && (
          <div className="mt-4 flex flex-wrap justify-center gap-2 px-4">
            {currentValues.map((v, i) => (
              <span
                key={i}
                className="flex h-11 min-w-[44px] items-center justify-center rounded-xl border border-primary-dim bg-primary-faint px-3 font-serif text-xl font-bold text-primary"
              >
                {v}
              </span>
            ))}
          </div>
        )}

        {currentValues.length > 1 && !rolling && (
          <div className="mt-3 flex items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
              Totale
            </span>
            <span className="font-serif text-4xl font-bold text-primary">
              {sum}
            </span>
          </div>
        )}

        {currentValues.length <= 1 && (
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-muted">
            d{selected}
          </p>
        )}

        {critMessage && (
          <p
            className={`mt-2 font-serif text-base italic ${
              isCritLow ? "text-destructive-foreground" : "text-primary"
            }`}
          >
            {critMessage}
          </p>
        )}
      </div>

      {/* Roll button */}
      <button
        type="button"
        onClick={roll}
        disabled={rolling}
        className="mx-6 mb-6 flex h-14 w-[calc(100%-3rem)] items-center justify-center gap-2 rounded-full bg-primary font-bold tracking-wide text-primary-foreground shadow-lg shadow-primary/30 transition-opacity disabled:opacity-70"
      >
        <RefreshCw size={20} className={rolling ? "animate-spin" : ""} />
        {rolling ? "Lanciando..." : `Lancia ${count}d${selected}`}
      </button>

      {/* Count selector */}
      <p className="mb-3 px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-primary">
        Quanti dadi
      </p>
      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto px-6">
        {COUNT_PRESETS.map((n) => {
          const active = count === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => {
                setCount(n);
                setCurrentValues([]);
              }}
              className={`flex h-10 min-w-[52px] flex-shrink-0 items-center justify-center rounded-full border px-3 text-sm font-semibold transition-colors ${
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

      {/* Die selector */}
      <p className="mb-3 px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-primary">
        Seleziona dado
      </p>
      <div className="mb-6 grid grid-cols-4 gap-3 px-6">
        {DICE.map((d) => {
          const active = selected === d.sides;
          return (
            <button
              key={d.sides}
              type="button"
              onClick={() => {
                setSelected(d.sides);
                setCurrentValues([]);
              }}
              className={`flex aspect-[0.9] flex-col items-center justify-center gap-1 rounded-xl border py-2 transition-colors ${
                active
                  ? "border-primary bg-primary-faint"
                  : "border-border bg-card"
              }`}
            >
              <DieShape sides={d.sides} size={54} variant={active ? "gold" : "muted"} />
              <span
                className={`text-xs font-semibold ${
                  active ? "font-bold text-primary" : "text-card-foreground"
                }`}
              >
                {d.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* History */}
      <div className="mb-3 flex items-center justify-between px-6">
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
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2"
              >
                <DieShape sides={h.sides} size={40} variant="muted" />
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-base font-semibold text-foreground">
                    {h.count}d{h.sides}
                  </p>
                  <p className="truncate text-[11px] text-muted">
                    {h.count > 1 && h.values.length <= 10
                      ? `${h.values.join(" + ")} = `
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
