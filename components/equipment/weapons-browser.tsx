"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminEditPencil } from "@/components/admin-edit/admin-edit-button";
import { ChevronRight, Coins, Weight, ArrowRight } from "lucide-react";

import { CatalogTitle } from "@/components/catalog-ui";
import { ListSearch } from "@/components/equipment/list-search";
import { FoundName } from "@/components/search/found-name";
import { InEnglish } from "@/components/search/in-english";
import { DidYouMean, useSettledQuery } from "@/components/search/did-you-mean";
import { useReportSearch } from "@/components/statistics/use-report-search";
import { englishShown, namesOf, type EnglishShown } from "@/lib/english-match";
import { normalizeSearch, searchList } from "@/lib/fuzzy-search";
import { ParentLink } from "@/components/section-tiles";
import { useEquipmentEdition } from "@/components/equipment/use-equipment-edition";
import { isMartial, isRanged, WEAPON_GROUP_TITLES, type EquipmentEdition, type WeaponListEdition, type WeaponListItem } from "@/lib/equipment-types";

type View = "elenco" | "carte";
type Kind = "tutte" | "semplici" | "guerra";
type Reach = "tutte" | "mischia" | "distanza";

const KINDS: [Kind, string][] = [["tutte", "Tutte"], ["semplici", "Semplici"], ["guerra", "Da guerra"]];
const REACHES: [Reach, string][] = [["tutte", "Tutte"], ["mischia", "Mischia"], ["distanza", "Distanza"]];
const plural = (n: number) => `${n} ${n === 1 ? "arma" : "armi"}`;
const damageType = (weapon: WeaponListEdition) => weapon.tipoDanno || "nessun danno";

/** Weapons of both editions: simple list grouped by category, or cards with filters. */
export function WeaponsBrowser({ items }: { items: WeaponListItem[] }) {
  const [edition, setEdition] = useEquipmentEdition("armi");
  const [view, setView] = useState<View>("elenco");
  const [kind, setKind] = useState<Kind>("tutte");
  const [reach, setReach] = useState<Reach>("tutte");
  // The view is kept in the address, so "back" from a weapon returns to the same view.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("vista") === "carte") setView("carte");
  }, []);
  const showView = (value: View) => {
    setView(value);
    const url = new URL(window.location.href);
    if (value === "carte") url.searchParams.set("vista", "carte");
    else url.searchParams.delete("vista");
    window.history.replaceState(window.history.state, "", url);
  };

  const inEdition = useMemo(() => items.filter(item => item.editions[edition]), [items, edition]);
  // The search (PROMPT 36): Italian and English names, typos tolerated (lib/fuzzy-search.ts), best first in each group.
  const [query, setQuery] = useState("");
  const settled = useSettledQuery(query);
  const result = useMemo(() => searchList(inEdition, query, item => namesOf(item.editions[edition]!.nome, item.editions[edition]!.en), { groupOf: item => item.gruppo, settled }), [inEdition, query, edition, settled]);
  const found = useMemo(() => [...result.exact, ...result.approximate], [result]);
  const searching = normalizeSearch(query) !== "";
  useReportSearch(query, result.exact.length, true, "armi");
  const filtered = useMemo(() => found.filter(item =>
    (kind === "tutte" || (kind === "guerra") === isMartial(item.gruppo)) &&
    (reach === "tutte" || (reach === "distanza") === isRanged(item.gruppo))), [found, kind, reach]);
  const row = (item: WeaponListItem) => {
    const weapon = item.editions[edition]!;
    return { item, weapon, edition, query, settled, english: englishShown(weapon.nome, weapon.en, query, { settled }) };
  };

  return (
    <div className="px-4 pb-8 pt-4 sm:px-6">
      <ParentLink href="/equipaggiamento" label="Equipaggiamento" />
      <CatalogTitle section="armi" title="Armi" edition={edition} onEdition={setEdition} />
      <p className="mt-2 text-[15px] text-muted">
        {plural(inEdition.length)} · {edition === "2024" ? "SRD 5.2.1, con Padronanza" : "SRD 5.1"}
      </p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4">
        <button type="button" onClick={() => showView(view === "elenco" ? "carte" : "elenco")}
          className="flex min-h-11 items-center gap-1.5 text-[15px] font-bold text-primary">
          {view === "elenco" ? "Vedi come carte" : "Vedi come elenco semplice"}
          <ChevronRight size={16} strokeWidth={2.4} aria-hidden="true" />
        </button>
        <span className="flex items-center gap-1.5 text-[13px] text-muted">
          <span className="inline-block size-2.5 rounded-full bg-amber" aria-hidden="true" />cambia tra le edizioni
        </span>
      </div>
      <ListSearch label="Cerca un’arma" value={query} onChange={setQuery} />
      <p role="status" className="mt-2 text-sm text-muted">{searching ? `${found.length} ${found.length === 1 ? "arma trovata" : "armi trovate"}` : ""}</p>
      {result.suggestion && <DidYouMean name={result.suggestion.editions[edition]!.nome} onPick={setQuery} className="mt-2" />}
      {searching && found.length === 0 && <p className="mt-3 text-[15px]">Nessuna arma con questo nome.</p>}

      {view === "elenco" ? (
        <div className="mt-3 space-y-5">
          {WEAPON_GROUP_TITLES.map((title, group) => {
            const rows = found.filter(item => item.gruppo === group);
            // While searching, the groups with no weapon found are left out.
            if (searching && !rows.length) return null;
            return (
              <section key={title} aria-labelledby={`gruppo-${group}`}>
                <div className="flex items-baseline justify-between border-b-2 border-primary px-0.5 pb-1.5 pt-1">
                  <h2 id={`gruppo-${group}`} className="font-serif text-[22px] font-bold text-primary">{title}</h2>
                  <span className="text-sm text-muted">{plural(rows.length)}</span>
                </div>
                <ul className="overflow-hidden rounded-b-[14px] border border-t-0 border-border bg-card">
                  {rows.map(item => <WeaponRow key={item.id} {...row(item)} />)}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="mt-3">
          <div role="group" aria-label="Categoria" className="flex flex-wrap gap-2">
            {KINDS.map(([value, label]) => <Chip key={value} pressed={kind === value} onClick={() => setKind(value)} dark>{label}</Chip>)}
          </div>
          <div role="group" aria-label="Distanza" className="mt-2 flex flex-wrap gap-2">
            {REACHES.map(([value, label]) => <Chip key={value} pressed={reach === value} onClick={() => setReach(value)}>{label}</Chip>)}
          </div>
          <p role="status" className="mt-3 text-sm text-muted">{plural(filtered.length)}</p>
          <ul className="mt-2 space-y-3">
            {filtered.map(item => <WeaponCard key={item.id} {...row(item)} />)}
          </ul>
        </div>
      )}
    </div>
  );
}

function Chip({ pressed, onClick, dark = false, children }: { pressed: boolean; onClick: () => void; dark?: boolean; children: string }) {
  const on = dark ? "border-foreground bg-foreground text-card" : "border-primary bg-primary text-primary-foreground";
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick}
      className={`min-h-11 rounded-full border-[1.5px] px-4 text-[15px] font-semibold ${pressed ? on : dark ? "border-border bg-card text-foreground" : "border-chip-border bg-card text-primary"}`}>
      {children}
    </button>
  );
}

interface RowProps { item: WeaponListItem; weapon: WeaponListEdition; edition: EquipmentEdition; query: string; settled: boolean; english?: EnglishShown }

function WeaponRow({ item, weapon, edition, query, settled, english }: RowProps) {
  return (
    <li className="flex items-center border-b border-divider last:border-b-0">
      {/* Administrator only: the pencil next to the name opens its card in /admin/contenuti. */}
      <AdminEditPencil target={{ kind: "contenuto", section: "armi", id: item.id, edition }} name={weapon.nome} />
      <Link href={`/equipaggiamento/armi/${item.id}`} prefetch={false} className="flex min-h-14 min-w-0 flex-1 items-center gap-2.5 px-3.5 py-2">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="font-serif text-xl font-bold leading-tight"><FoundName name={weapon.nome} query={query} settled={settled} /></span>
            {item.changed && <span className="size-2.5 shrink-0 rounded-full bg-amber" role="img" aria-label="Cambia tra le edizioni" />}
          </span>
          <InEnglish shown={english} className="mt-0.5" />
          <span className="block text-[14px] text-muted">{damageType(weapon)} · {weapon.costo}</span>
        </span>
        <span className="font-serif text-2xl font-bold text-primary">{weapon.danni || "—"}</span>
        <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden="true" />
      </Link>
    </li>
  );
}

function WeaponCard({ item, weapon, edition, query, settled, english }: RowProps) {
  const dice = weapon.danni || "—";
  return (
    <li className="flex items-center">
      <AdminEditPencil target={{ kind: "contenuto", section: "armi", id: item.id, edition }} name={weapon.nome} />
      <Link href={`/equipaggiamento/armi/${item.id}`} prefetch={false}
        className="flex min-w-0 flex-1 overflow-hidden rounded-[14px] border border-border bg-card shadow-[0_1px_0_var(--color-divider)]">
        <span className="flex w-[84px] shrink-0 flex-col items-center justify-center gap-0.5 border-r border-chip-border bg-primary-faint px-1 py-2.5 text-center">
          <span className={`font-serif font-bold leading-none text-primary ${dice.length > 3 ? "text-[28px]" : "text-[34px]"}`}>{dice}</span>
          <span className="text-[12px] font-semibold leading-tight text-muted">{damageType(weapon)}</span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-2 px-3.5 py-3">
          <span className="flex items-start justify-between gap-2">
            <span className="min-w-0">
              <span className="block font-serif text-[22px] font-bold leading-tight"><FoundName name={weapon.nome} query={query} settled={settled} /></span>
              <InEnglish shown={english} className="mt-0.5" />
            </span>
            {edition === "2024" && weapon.padronanza && (
              <span className="shrink-0 rounded-full bg-amber px-2.5 py-1 text-[12px] font-bold text-foreground">{weapon.padronanza}</span>
            )}
          </span>
          {weapon.proprieta.length > 0 && (
            <span className="flex flex-wrap gap-1.5">
              {weapon.proprieta.map(property => (
                <span key={property} className="rounded-full border border-chip-border bg-card px-2.5 py-0.5 text-[13px] font-semibold text-primary">{property}</span>
              ))}
            </span>
          )}
          <span className="flex items-center gap-3.5 text-[14px] text-muted">
            <span className="flex items-center gap-1"><Weight size={15} aria-hidden="true" /><span className="sr-only">Peso </span>{weapon.peso}</span>
            <span className="flex items-center gap-1"><Coins size={15} aria-hidden="true" /><span className="sr-only">Costo </span>{weapon.costo}</span>
          </span>
          {item.changeNote && (
            <span className="flex items-center gap-2 rounded-lg bg-primary px-2.5 py-1.5 text-[13px] font-semibold text-primary-foreground">
              <ArrowRight size={14} strokeWidth={2.4} className="shrink-0" aria-hidden="true" />
              <span>{item.changeNote}</span>
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
