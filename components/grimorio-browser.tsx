"use client";

import { useMemo, useState } from "react";
import { ChevronDown, FileText, Search, X } from "lucide-react";

import { SpellRow } from "@/components/spell-row";
import {
  capitalizeWords,
  levelLabel,
  type Spell,
  type SpellsMeta,
} from "@/lib/spells-types";

type FilterKind = "livello" | "scuola" | "classe" | null;

interface Props {
  spells: Spell[];
  meta: SpellsMeta;
  initialLivello: number | null;
  initialScuola: string | null;
  initialClasse: string | null;
}

export function GrimorioBrowser({
  spells,
  meta,
  initialLivello,
  initialScuola,
  initialClasse,
}: Props) {
  const [q, setQ] = useState("");
  const [livello, setLivello] = useState<number | null>(initialLivello);
  const [scuola, setScuola] = useState<string | null>(initialScuola);
  const [classe, setClasse] = useState<string | null>(initialClasse);
  const [openFilter, setOpenFilter] = useState<FilterKind>(null);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return spells.filter((s) => {
      if (needle && !s.nome_italiano.toLowerCase().includes(needle)) return false;
      if (livello !== null && s.livello_num !== livello) return false;
      if (scuola && s.scuola.toLowerCase() !== scuola.toLowerCase()) return false;
      if (classe && !s.classi.includes(classe.toLowerCase())) return false;
      return true;
    });
  }, [spells, q, livello, scuola, classe]);

  const activeCount =
    (livello !== null ? 1 : 0) + (scuola ? 1 : 0) + (classe ? 1 : 0);

  const clearFilters = () => {
    setLivello(null);
    setScuola(null);
    setClasse(null);
    setOpenFilter(null);
  };

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 px-6 pb-3 pt-6 backdrop-blur">
        <h1 className="mb-4 font-serif text-3xl font-bold text-foreground">
          Grimorio
        </h1>

        {/* Search */}
        <div className="flex h-12 items-center gap-2 rounded-xl border border-border bg-card px-3">
          <Search size={18} className="text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca incantesimo..."
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
            label={livello !== null ? levelLabel(livello) : "Livello"}
            active={livello !== null}
            caret
            onClick={() =>
              setOpenFilter(openFilter === "livello" ? null : "livello")
            }
          />
          <Chip
            label={scuola ?? "Scuola"}
            active={!!scuola}
            caret
            onClick={() =>
              setOpenFilter(openFilter === "scuola" ? null : "scuola")
            }
          />
          <Chip
            label={classe ? capitalizeWords(classe) : "Classe"}
            active={!!classe}
            caret
            onClick={() =>
              setOpenFilter(openFilter === "classe" ? null : "classe")
            }
          />
          {activeCount > 0 && (
            <Chip label="Pulisci" active destructive onClick={clearFilters} />
          )}
        </div>

        {/* Expanded options */}
        {openFilter && (
          <div className="no-scrollbar -mx-6 mt-2 flex gap-2 overflow-x-auto border-t border-divider bg-card px-6 py-3">
            {openFilter === "livello" &&
              meta.livelli.map((n) => (
                <Option
                  key={n}
                  label={levelLabel(n)}
                  active={livello === n}
                  onClick={() => {
                    setLivello(livello === n ? null : n);
                    setOpenFilter(null);
                  }}
                />
              ))}
            {openFilter === "scuola" &&
              meta.scuole.map((s) => (
                <Option
                  key={s}
                  label={s}
                  active={scuola === s}
                  onClick={() => {
                    setScuola(scuola === s ? null : s);
                    setOpenFilter(null);
                  }}
                />
              ))}
            {openFilter === "classe" &&
              meta.classi.map((c) => (
                <Option
                  key={c}
                  label={capitalizeWords(c)}
                  active={classe === c}
                  onClick={() => {
                    setClasse(classe === c ? null : c);
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
          <FileText size={48} className="text-muted" />
          <p className="font-serif text-base italic text-muted">
            Nessun incantesimo trovato.
          </p>
        </div>
      ) : (
        <ul className="px-6 py-2">
          {results.map((spell, i) => (
            <li key={spell.id}>
              {i > 0 && <div className="ml-[15px] h-px bg-divider" />}
              <SpellRow spell={spell} />
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
