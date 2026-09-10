"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, Skull, X } from "lucide-react";

import { MonsterRow } from "@/components/monster-row";
import {
  gsLabel,
  typeCategory,
  type Monster,
  type MonstersMeta,
} from "@/lib/monsters-types";

type FilterKind = "taglia" | "tipo" | "gs" | null;

interface Props {
  monsters: Monster[];
  meta: MonstersMeta;
  initialTaglia: string | null;
  initialTipo: string | null;
  initialGs: string | null;
}

export function BestiarioBrowser({
  monsters,
  meta,
  initialTaglia,
  initialTipo,
  initialGs,
}: Props) {
  const [q, setQ] = useState("");
  const [taglia, setTaglia] = useState<string | null>(initialTaglia);
  const [tipo, setTipo] = useState<string | null>(initialTipo);
  const [gs, setGs] = useState<string | null>(initialGs);
  const [openFilter, setOpenFilter] = useState<FilterKind>(null);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = monsters.filter((m) => {
      if (needle && !m.nome.toLowerCase().includes(needle)) return false;
      if (taglia && m.taglia !== taglia) return false;
      if (tipo && typeCategory(m.tipo) !== tipo) return false;
      if (gs && m.grado_sfida !== gs) return false;
      return true;
    });

    // Ordine crescente per grado sfida; a parità, ordine alfabetico.
    return filtered.sort((a, b) => {
      const d = a.gs_num - b.gs_num;
      if (d !== 0) return d;
      return a.nome.localeCompare(b.nome, "it");
    });
  }, [monsters, q, taglia, tipo, gs]);

  const activeCount = (taglia ? 1 : 0) + (tipo ? 1 : 0) + (gs ? 1 : 0);

  const clearFilters = () => {
    setTaglia(null);
    setTipo(null);
    setGs(null);
    setOpenFilter(null);
  };

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 px-6 pb-3 pt-6 backdrop-blur">
        <h1 className="mb-4 font-serif text-3xl font-bold text-foreground">
          Bestiario
        </h1>

        {/* Search */}
        <div className="flex h-12 items-center gap-2 rounded-xl border border-border bg-card px-3">
          <Search size={18} className="text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca mostro..."
            autoCorrect="off"
            autoCapitalize="none"
            className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted"
          />
          {q.length > 0 && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Cancella ricerca"
            >
              <X size={18} className="text-muted" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          <Chip
            label={gs ? gsLabel(gs) : "Grado sfida"}
            active={!!gs}
            caret
            onClick={() => setOpenFilter(openFilter === "gs" ? null : "gs")}
          />
          <Chip
            label={tipo ?? "Tipo"}
            active={!!tipo}
            caret
            onClick={() => setOpenFilter(openFilter === "tipo" ? null : "tipo")}
          />
          <Chip
            label={taglia ?? "Taglia"}
            active={!!taglia}
            caret
            onClick={() =>
              setOpenFilter(openFilter === "taglia" ? null : "taglia")
            }
          />
          {activeCount > 0 && (
            <Chip label="Pulisci" active destructive onClick={clearFilters} />
          )}
        </div>

        {/* Expanded options */}
        {openFilter && (
          <div className="no-scrollbar -mx-6 mt-2 flex gap-2 overflow-x-auto border-t border-divider bg-card px-6 py-3">
            {openFilter === "gs" &&
              meta.gradi.map((g) => (
                <Option
                  key={g}
                  label={gsLabel(g)}
                  active={gs === g}
                  onClick={() => {
                    setGs(gs === g ? null : g);
                    setOpenFilter(null);
                  }}
                />
              ))}
            {openFilter === "tipo" &&
              meta.tipi.map((t) => (
                <Option
                  key={t}
                  label={t}
                  active={tipo === t}
                  onClick={() => {
                    setTipo(tipo === t ? null : t);
                    setOpenFilter(null);
                  }}
                />
              ))}
            {openFilter === "taglia" &&
              meta.taglie.map((t) => (
                <Option
                  key={t}
                  label={t}
                  active={taglia === t}
                  onClick={() => {
                    setTaglia(taglia === t ? null : t);
                    setOpenFilter(null);
                  }}
                />
              ))}
          </div>
        )}
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
          <Skull size={48} className="text-muted" />
          <p className="font-serif text-base italic text-muted">
            Nessun mostro trovato.
          </p>
        </div>
      ) : (
        <ul className="px-6 py-2">
          {results.map((monster, i) => (
            <li key={monster.id}>
              {i > 0 && <div className="ml-[15px] h-px bg-divider" />}
              <MonsterRow monster={monster} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Chip({
  label,
  active,
  caret,
  destructive,
  onClick,
}: {
  label: string;
  active: boolean;
  caret?: boolean;
  destructive?: boolean;
  onClick: () => void;
}) {
  const base =
    "flex h-9 flex-shrink-0 items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold transition-colors";
  const cls = destructive
    ? "border-destructive bg-card text-destructive-foreground"
    : active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-card text-card-foreground";
  return (
    <button type="button" onClick={onClick} className={`${base} ${cls}`}>
      {label}
      {caret && <ChevronDown size={14} />}
    </button>
  );
}

function Option({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-shrink-0 rounded-xl border px-4 py-2 text-[13px] font-semibold transition-colors ${
        active
          ? "border-primary bg-primary-faint text-primary"
          : "border-border bg-elevated text-card-foreground"
      }`}
    >
      {label}
    </button>
  );
}
