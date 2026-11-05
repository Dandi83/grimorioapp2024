"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Check, ChevronLeft, ChevronRight, Shield, TriangleAlert } from "lucide-react";

import {
  ABILITIES, backgroundName, cardLine, className, finalAbilities, metres, modifier, newLocalId, readCharacters, sameCharacter, sheetSpells, signed,
  skillName, speciesLabel, subclassName, writeCharacters, type CharacterNames, type SavedCharacter,
} from "@/lib/characters-beta";
import { decodeHash, encodePg, validaScheda, type ErroreCampo, type SchedaV1 } from "@/lib/shared/scheda-tpk-v1";
import { spellHref, storedSpellId } from "@/lib/spell-public-id";
import { TPK_CREATE_URL, tpkImportUrl } from "@/lib/tpk";
import { Divisore, Timbro } from "@/components/pergamena/pergamena";

const SITE = "https://ilgrimorio.app";
const LINK_HASH = /^#(pg|pg0|party|party0)=/;

/** The 12 portraits of the classes (PROMPT 64, «grafica originale © 2026 D.d.B.», public/ritratti/classi), only on this page. */
const PORTRAITS = new Set(["barbaro", "bardo", "chierico", "druido", "guerriero", "ladro", "mago", "monaco", "paladino", "ranger", "stregone", "warlock"]);
/** «Ritratto del Mago», «Ritratto dello Stregone». */
const portraitAlt = (id: string) => `Ritratto ${id === "stregone" ? "dello" : "del"} ${className(id)}`;

/** The round portrait of the class: zoom 1.12, centred at 42 % in height, thin bordeaux border; loaded only when on screen. */
function ClassPortrait({ id, size = 44 }: { id: string; size?: number }) {
  if (!PORTRAITS.has(id)) {
    return (
      <span aria-hidden="true" data-class-icon={id} className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#7A1F2B] text-[#FFFBF0]" style={{ width: size, height: size }}>
        <Shield size={Math.round(size * 0.58)} strokeWidth={1.8} />
      </span>
    );
  }
  return (
    <span data-class-portrait={id} className="inline-flex shrink-0 overflow-hidden rounded-full border-2 border-[#7A1F2B] bg-[#2B2118]" style={{ width: size, height: size }}>
      <Image src={`/ritratti/classi/classe-${id}.webp`} alt={portraitAlt(id)} width={size} height={size} unoptimized loading="lazy" decoding="async"
        className="h-full w-full object-cover" style={{ objectPosition: "50% 42%", transform: "scale(1.12)", transformOrigin: "50% 42%" }} />
    </span>
  );
}

/** «BETA» as a tilted stamp next to the title. */
function BetaLabel() {
  return <Timbro data-beta-label="">BETA</Timbro>;
}

/** Title of the page: «LA TUA COMPAGNIA» above, capilettera, the stamp, the divider with ⚔ under it. */
function PageTitle({ id, children }: { id: string; children: string }) {
  return (
    <header>
      <p className="pg-etichetta">La tua compagnia</p>
      <h1 id={id} className="pg-capolettera mt-1 font-serif text-[34px] font-bold leading-tight">{children}<BetaLabel /></h1>
      <Divisore ornamento="spade" className="mt-2" />
    </header>
  );
}

/** The storage of this browser, or null when the page cannot use it (private window, blocked site data). */
function browserStorage(): Storage | null {
  try {
    const storage = window.localStorage;
    const probe = "grimorio.characters.prova";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

/** The address without «#…» (the character stays only in the saved list, never in the history). */
function dropHash() {
  try { window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`); } catch { /* old browsers */ }
}

type Incoming = { kind: "incoming"; party: boolean; sheets: SchedaV1[] } | { kind: "broken"; message: string; errors: ErroreCampo[][] };
type View = { kind: "list" } | Incoming | { kind: "sheet"; id: string };

export function CharactersApp({ names }: { names: CharacterNames }) {
  const [list, setList] = useState<SavedCharacter[] | null>([]);
  const [storageOk, setStorageOk] = useState(true);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>({ kind: "list" });

  const readLink = useCallback(async () => {
    const hash = window.location.hash;
    if (!LINK_HASH.test(hash)) return;
    const result = await decodeHash(hash);
    if (result.ok) setView({ kind: "incoming", party: result.party, sheets: result.schede });
    else setView({ kind: "broken", message: result.errore, errors: result.errori ?? [] });
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const storage = browserStorage();
    const saved = readCharacters(storage);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the browser storage is read once, after hydration
    setStorageOk(saved !== null);
    setList(saved ?? []);
    setReady(true);
    void readLink();
    const onHash = () => void readLink();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [readLink]);

  const persist = (next: SavedCharacter[]) => {
    setList(next);
    if (!writeCharacters(browserStorage(), next)) setStorageOk(false);
  };
  const toList = () => { dropHash(); setView({ kind: "list" }); window.scrollTo(0, 0); };

  if (!ready) return <div className="min-h-[60vh]" aria-busy="true" />;
  const characters = list ?? [];
  return (
    <div data-characters-app="" className="mx-auto max-w-[720px] px-4 pb-32 pt-5 text-foreground">
      {view.kind === "list" && (
        <CharacterList characters={characters} storageOk={storageOk} onOpen={id => { setView({ kind: "sheet", id }); window.scrollTo(0, 0); }} />
      )}
      {view.kind === "incoming" && (
        <IncomingCharacters sheets={view.sheets} party={view.party} names={names} saved={characters} storageOk={storageOk}
          onSave={next => { persist(next); toList(); }} onCancel={toList} />
      )}
      {view.kind === "broken" && <BrokenLink message={view.message} errors={view.errors} onClose={toList} />}
      {view.kind === "sheet" && (() => {
        const character = characters.find(item => item.id === view.id);
        if (!character) return <CharacterList characters={characters} storageOk={storageOk} onOpen={id => setView({ kind: "sheet", id })} />;
        return <CharacterSheet character={character} names={names} onBack={() => setView({ kind: "list" })}
          onDelete={() => { persist(characters.filter(item => item.id !== character.id)); setView({ kind: "list" }); }} />;
      })()}
    </div>
  );
}

/* ------------------------------------------------------------------ 1. Elenco */

function StorageNote({ ok }: { ok: boolean }) {
  return ok ? (
    <p data-storage-note="" className="mt-4 rounded-xl border-2 border-dashed border-amber bg-[#FCEFD0]/60 px-4 py-3 text-[15px] leading-6 text-[#5E3E00]">
      Salvati solo su questo telefono. Per non perderli usa «Copia il link» in ogni scheda.
    </p>
  ) : (
    <p role="alert" data-storage-off="" className="mt-4 rounded-xl border-2 border-dashed border-[#7A1F2B] bg-[#F1DDD5] px-4 py-3 text-[15px] leading-6 text-[#7A1F2B]">
      Questo browser non permette di salvare (per esempio in una finestra privata): puoi vedere i personaggi, ma non restano dopo la chiusura. Usa «Copia il link» per tenerli.
    </p>
  );
}

function CharacterList({ characters, storageOk, onOpen }: { characters: SavedCharacter[]; storageOk: boolean; onOpen: (id: string) => void }) {
  return (
    <section aria-labelledby="personaggi-titolo">
      <PageTitle id="personaggi-titolo">I miei personaggi</PageTitle>
      <StorageNote ok={storageOk} />
      {characters.length === 0 ? (
        <p data-characters-empty="" className="mt-6 text-[16px] leading-7 text-muted">
          Non hai ancora personaggi. Creane uno con Total Party Kill: quando è pronto torna qui con il suo link e lo salvi nel Grimorio.
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-3" aria-label="Personaggi salvati">
          {characters.map(({ id, sheet }) => (
            <li key={id}>
              <button type="button" onClick={() => onOpen(id)} data-character-card={sheet.n}
                className="pg-angoli flex w-full min-h-[72px] items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left active:bg-[#F1E7D0]">
                <ClassPortrait id={sheet.c} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[18px] font-bold leading-6">{sheet.n}</span>
                  <span className="block text-[14px] leading-5 text-muted">{cardLine(sheet)}</span>
                </span>
                <ChevronRight size={22} className="shrink-0 text-[#7A1F2B]" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-7 flex flex-col items-center gap-2">
        <a href={TPK_CREATE_URL} target="_blank" rel="noopener noreferrer" data-create-character=""
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#7A1F2B] px-6 text-[17px] font-bold text-[#FFFBF0] sm:w-auto">
          ＋ Crea il tuo personaggio
        </a>
        <p className="text-[14px] text-muted">Si apre la creazione guidata di Total Party Kill</p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ 2. Personaggio ricevuto */

function Tick({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 py-1.5" data-check={ok ? "ok" : "ko"}>
      <span aria-hidden="true" className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${ok ? "bg-[#2E6B3A] text-white" : "bg-[#7A1F2B] text-white"}`}>
        {ok ? <Check size={14} strokeWidth={3} /> : <TriangleAlert size={12} strokeWidth={3} />}
      </span>
      <span className="text-[15px] leading-6">{children}</span>
    </li>
  );
}

function CalcTiles({ calc, note }: { calc: SchedaV1["calc"]; note: string }) {
  const tiles: [string, string][] = calc
    ? [["PF", String(calc.pf)], ["CA", String(calc.ca)], ...(calc.cd !== undefined ? [["CD", String(calc.cd)] as [string, string]] : []), ["INIZ.", signed(calc.ini)], ["M", metres(calc.vel)]]
    : [["PF", "—"], ["CA", "—"], ["CD", "—"], ["INIZ.", "—"], ["M", "—"]];
  return (
    <div>
      <dl className="grid grid-cols-5 gap-2" data-calc="">
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-card px-1 py-2 text-center" data-calc-tile={label}>
            <dt className="text-[11px] font-bold tracking-[0.06em] text-muted">{label}</dt>
            <dd className="font-serif text-[24px] font-bold leading-7 text-[#7A1F2B]">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-1.5 text-center text-[13px] text-muted">{calc ? note : "valori non arrivati da Total Party Kill"}</p>
    </div>
  );
}

function Summary({ sheet, names }: { sheet: SchedaV1; names: CharacterNames }) {
  const sub = subclassName(sheet, names);
  return (
    <div className="pg-angoli flex items-start gap-3 rounded-2xl border border-border bg-card p-4" data-incoming-summary={sheet.n}>
      <ClassPortrait id={sheet.c} size={56} />
      <div className="min-w-0">
        <p className="font-serif text-[26px] font-bold leading-tight">{sheet.n}</p>
        <p className="text-[15px] leading-6">{className(sheet.c)}{sub ? ` · ${sub}` : ""}</p>
        <p className="text-[15px] leading-6">{speciesLabel(sheet)} · {backgroundName(sheet.bg)}</p>
        <p className="text-[15px] leading-6 text-muted">{sheet.l}° livello</p>
      </div>
    </div>
  );
}

function IncomingCharacters({ sheets, party, names, saved, storageOk, onSave, onCancel }: {
  sheets: SchedaV1[]; party: boolean; names: CharacterNames; saved: SavedCharacter[]; storageOk: boolean;
  onSave: (next: SavedCharacter[]) => void; onCancel: () => void;
}) {
  const [asking, setAsking] = useState(false);
  const duplicates = sheets.filter(sheet => sameCharacter(saved, sheet));
  const save = (replace: boolean) => {
    let next = [...saved];
    for (const sheet of sheets) {
      const entry: SavedCharacter = { id: newLocalId(), savedAt: new Date().toISOString(), sheet };
      const old = replace ? sameCharacter(next, sheet) : undefined;
      next = old ? next.map(item => (item.id === old.id ? { ...entry, id: old.id } : item)) : [...next, entry];
    }
    onSave(next);
  };
  return (
    <section aria-labelledby="ricevuto-titolo">
      <PageTitle id="ricevuto-titolo">{party ? "Nuovo party" : "Nuovo personaggio"}</PageTitle>
      <p className="mt-1 text-[15px] text-muted">Arrivato da Total Party Kill</p>
      {!storageOk && <StorageNote ok={false} />}
      <div className="mt-4 flex flex-col gap-6">
        {sheets.map((sheet, index) => {
          const spells = sheetSpells(sheet);
          const found = spells.filter(id => names.spells[id]);
          const missing = spells.filter(id => !names.spells[id]);
          const errors = validaScheda(sheet);
          return (
            <article key={`${sheet.n}-${index}`} className="flex flex-col gap-4" data-incoming={sheet.n}>
              <Summary sheet={sheet} names={names} />
              <div>
                <h2 className="font-serif text-[22px] font-bold">Controlli</h2>
                <ul className="mt-1" data-checks="">
                  <Tick ok={errors.length === 0}>{errors.length === 0 ? "Tutto dall’SRD 5.2.1" : `${errors.length} campi da controllare`}</Tick>
                  <Tick ok={Boolean(className(sheet.c) && speciesLabel(sheet) && backgroundName(sheet.bg))}>Classe, specie e background riconosciuti</Tick>
                  <Tick ok={missing.length === 0}>
                    {found.length} {found.length === 1 ? "incantesimo trovato" : "incantesimi trovati"} nel Grimorio
                    {missing.length > 0 && <> · non trovati: {missing.join(", ")}</>}
                  </Tick>
                </ul>
              </div>
              {sheet.calc && (
                <div>
                  <h2 className="mb-2 font-serif text-[22px] font-bold">Valori calcolati da TPK</h2>
                  <CalcTiles calc={sheet.calc} note="calcolati da Total Party Kill" />
                </div>
              )}
            </article>
          );
        })}
      </div>
      {asking ? (
        <div role="alertdialog" aria-labelledby="doppione" className="mt-6 rounded-2xl border-2 border-[#7A1F2B] bg-card p-4" data-duplicate="">
          <p id="doppione" className="text-[16px] leading-6">
            Hai già {duplicates.map(sheet => `«${sheet.n}» (${className(sheet.c)})`).join(", ")}. Vuoi sostituirlo o salvarlo come nuovo?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => save(true)} className="min-h-11 flex-1 rounded-full bg-[#7A1F2B] px-5 font-bold text-[#FFFBF0]">Sostituisci</button>
            <button type="button" onClick={() => save(false)} className="min-h-11 flex-1 rounded-full border-2 border-[#7A1F2B] px-5 font-bold text-[#7A1F2B]">Salva come nuovo</button>
          </div>
        </div>
      ) : (
        <div className="mt-7 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => (duplicates.length ? setAsking(true) : save(false))}
            className="min-h-12 flex-1 rounded-full bg-[#7A1F2B] px-6 text-[17px] font-bold text-[#FFFBF0]">Salva nei miei personaggi</button>
          <button type="button" onClick={onCancel} className="min-h-12 flex-1 rounded-full border-2 border-[#7A1F2B] px-6 text-[17px] font-bold text-[#7A1F2B]">Annulla</button>
        </div>
      )}
    </section>
  );
}

function BrokenLink({ message, errors, onClose }: { message: string; errors: ErroreCampo[][]; onClose: () => void }) {
  return (
    <section aria-labelledby="link-rovinato" data-broken-link="">
      <PageTitle id="link-rovinato">Link non valido</PageTitle>
      <p role="alert" className="mt-3 rounded-xl border-2 border-[#7A1F2B] bg-[#F1DDD5] px-4 py-3 text-[16px] leading-6 text-[#7A1F2B]">{message}</p>
      {errors.some(list => list.length) && (
        <ul className="mt-3 list-disc pl-6 text-[15px] leading-6">
          {errors.flatMap((list, index) => list.map(error => (
            <li key={`${index}-${error.campo}-${error.messaggio}`}>{errors.length > 1 ? `Personaggio ${index + 1} · ` : ""}{error.messaggio}</li>
          )))}
        </ul>
      )}
      <button type="button" onClick={onClose} className="mt-6 min-h-12 w-full rounded-full border-2 border-[#7A1F2B] px-6 text-[17px] font-bold text-[#7A1F2B] sm:w-auto">Torna ai miei personaggi</button>
    </section>
  );
}

/* ------------------------------------------------------------------ 3. Scheda */

function CharacterSheet({ character, names, onBack, onDelete }: { character: SavedCharacter; names: CharacterNames; onBack: () => void; onDelete: () => void }) {
  const { sheet } = character;
  const [allSpells, setAllSpells] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [links, setLinks] = useState<{ play: string; share: string } | null>(null);
  useEffect(() => {
    let alive = true;
    void encodePg(sheet).then(hash => { if (alive) setLinks({ play: tpkImportUrl(hash), share: `${SITE}/personaggi${hash}` }); });
    return () => { alive = false; };
  }, [sheet]);
  const scores = finalAbilities(sheet);
  const spells = sheetSpells(sheet);
  const shown = allSpells ? spells : spells.slice(0, 5);
  const sub = subclassName(sheet, names);

  const copy = async () => {
    if (!links) return;
    try {
      await navigator.clipboard.writeText(links.share);
      setCopied("Link copiato");
    } catch {
      setCopied(links.share);
    }
  };

  return (
    <article aria-labelledby="scheda-nome" data-character-sheet={sheet.n}>
      <button type="button" onClick={onBack} className="mb-3 inline-flex min-h-11 items-center gap-1 text-[15px] font-bold text-[#7A1F2B]">
        <ChevronLeft size={18} aria-hidden="true" />I miei personaggi
      </button>
      <div className="flex items-center gap-3">
        <ClassPortrait id={sheet.c} size={64} />
        <div className="min-w-0">
          <h1 id="scheda-nome" className="pg-capolettera font-serif text-[32px] font-bold leading-tight">{sheet.n}</h1>
          <p className="text-[15px] leading-6" data-sheet-line="">
            {sheet.l}° livello · <Link href={`/classi/${sheet.c}`} className="font-semibold text-[#7A1F2B] underline underline-offset-2">{className(sheet.c)}</Link>
            {sub ? ` (${sub})` : ""} · {speciesLabel(sheet)} · {backgroundName(sheet.bg)}
          </p>
        </div>
      </div>

      <div className="mt-5"><CalcTiles calc={sheet.calc} note="calcolati da Total Party Kill" /></div>

      <dl className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6" data-abilities="">
        {ABILITIES.map(({ key, short }) => (
          <div key={key} className="rounded-xl bg-[#2B2118] px-1 py-2 text-center text-[#FFFBF0]" data-ability={short}>
            <dt className="text-[12px] font-bold tracking-[0.08em] text-amber">{short}</dt>
            <dd>
              <span className="block font-serif text-[26px] font-bold leading-7" data-score="">{scores[key]}</span>
              <span className="block text-[14px]" data-modifier="">{signed(modifier(scores[key]))}</span>
            </dd>
          </div>
        ))}
      </dl>

      <section className="mt-6" aria-labelledby="abilita-talenti">
        <h2 id="abilita-talenti" className="font-serif text-[22px] font-bold">Abilità e talenti</h2>
        <p className="mt-1 text-[15px] leading-6" data-skills="">{sheet.sk.map(skillName).join(" · ") || "—"}</p>
        {sheet.ft.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2" data-feats="">
            {sheet.ft.map((feat, index) => (
              <li key={`${feat.id}-${index}`}>
                <Link href={`/talenti/${feat.id}`} className="inline-flex min-h-9 items-center rounded-full border border-[#D9B7AC] bg-[#F1DDD5] px-3 text-[14px] font-semibold text-[#7A1F2B]">
                  {names.feats[feat.id] ?? feat.id}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {spells.length > 0 && (
        <section className="mt-6" aria-labelledby="incantesimi">
          <h2 id="incantesimi" className="font-serif text-[22px] font-bold">Incantesimi</h2>
          <ul className="mt-2 flex flex-wrap gap-2" data-spells="">
            {shown.map(id => (
              <li key={id}>
                {names.spells[id]
                  ? <Link href={spellHref(storedSpellId(id))} data-spell={id} className="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3 text-[14px] font-semibold text-[#7A1F2B] underline-offset-2">{names.spells[id]}</Link>
                  : <span data-spell={id} className="inline-flex min-h-9 items-center rounded-full border border-dashed border-border px-3 text-[14px]">{id}</span>}
              </li>
            ))}
            {!allSpells && spells.length > 5 && (
              <li>
                <button type="button" onClick={() => setAllSpells(true)} data-more-spells="" aria-label={`Mostra altri ${spells.length - 5} incantesimi`}
                  className="inline-flex min-h-9 items-center rounded-full bg-[#7A1F2B] px-3 text-[14px] font-bold text-[#FFFBF0]">+{spells.length - 5}</button>
              </li>
            )}
          </ul>
        </section>
      )}

      <div className="mt-8 flex flex-col gap-2">
        <a href={links?.play ?? tpkImportUrl("")} target="_blank" rel="noopener noreferrer" data-play=""
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#7A1F2B] px-6 text-[17px] font-bold text-[#FFFBF0]">🎲 Gioca in Total Party Kill</a>
        <button type="button" onClick={copy} disabled={!links} data-copy-link=""
          className="min-h-12 rounded-full border-2 border-[#7A1F2B] px-6 text-[17px] font-bold text-[#7A1F2B]">🔗 Copia il link</button>
        {copied && <p role="status" data-copied="" className="break-all text-center text-[14px] text-muted">{copied}</p>}
        {confirming ? (
          <div role="alertdialog" aria-labelledby="conferma-elimina" className="rounded-2xl border-2 border-[#7A1F2B] bg-card p-4" data-delete-confirm="">
            <p id="conferma-elimina" className="text-[16px] leading-6">Eliminare «{sheet.n}» da questo telefono? Se non hai copiato il link non si può recuperare.</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={onDelete} className="min-h-11 flex-1 rounded-full bg-[#7A1F2B] px-4 font-bold text-[#FFFBF0]">Elimina</button>
              <button type="button" onClick={() => setConfirming(false)} className="min-h-11 flex-1 rounded-full border-2 border-[#7A1F2B] px-4 font-bold text-[#7A1F2B]">Annulla</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} data-delete="" className="min-h-12 rounded-full px-6 text-[16px] font-bold text-[#7A1F2B] underline underline-offset-4">🗑 Elimina</button>
        )}
      </div>
    </article>
  );
}
