import Link from "next/link";
import { Eye, EyeOff, LayoutGrid, Pencil, Plus, Trash2, Wrench } from "lucide-react";

import { AdminLogin } from "@/components/admin-login";
import { UndoButton } from "@/components/admin-content/undo-button";
import { FieldDiff } from "@/components/admin-srd/diff-text";
import { wordDiff } from "@/lib/word-diff";
import { isAdmin } from "@/lib/admin-auth";
import { inAdminEdition, isAdminEdition, type AdminEdition } from "@/lib/admin-edition";
import { adminEdition } from "@/lib/admin-edition-server";
import { activeOverrideMap, overrideHealth } from "@/lib/content-overrides-apply";
import { allOverrides } from "@/lib/content-overrides";
import { CONTENT_SECTIONS, fieldLabels, isContentEdition, sectionSpec } from "@/lib/content-sections";
import { documentedRepairs } from "@/lib/documented-repairs";
import { EDITOR_FIELDS, allEditorLog, type EditorSection } from "@/lib/editor-log";
import { formatWhen } from "@/lib/feedback-input";
import { getMonsterListIndex } from "@/lib/monster-index";
import { getSpellIndex } from "@/lib/spell-index";
import { spellName } from "@/lib/spell-name";

const spellNameOf = (spell: { nome_italiano: string; edizione?: string } | undefined) => (spell ? spellName(spell.nome_italiano, spell.edizione) : undefined);
import { isPublicSectionKey, publicSection, sectionParts } from "@/lib/public-sections";
import { allCardLog, allSectionLog } from "@/lib/section-visibility";
import { allHomebrewLog } from "@/lib/homebrew";
import { allSubclassLog } from "@/lib/subclasses";
import { subclassClass } from "@/lib/subclass-types";
import { spellHref } from "@/lib/spell-public-id";

export const dynamic = "force-dynamic";
export const metadata = { title: "Registro — Il Grimorio.App", robots: { index: false, follow: false } };

const HEALTH: Record<string, string> = {
  orphan: "La scheda o il campo non esiste più nei dati originali: la correzione non ha effetto.",
  "original-changed": "Il valore del manuale è cambiato dopo la correzione: controlla se serve ancora.",
};

/** One line of the log: a correction over the manual, or a change made with the spell/creature editor. */
interface LogItem {
  id: string; editor: boolean; sezione: string; when: Date; undoneAt: Date | null; inForce: boolean;
  title: string; card: string; href?: string; field: string; before: string; after: string; motivo: string; warning?: string;
  /** The edition of the card; none for what both editions share (a section shown or hidden). */
  edition: AdminEdition | null;
  /** Shown instead of «Annulla»: a section switch is undone by switching it again. */
  fixed?: string;
  /** The sentence of the entry: «Hai modificato «X»», «Hai nascosto «Y»». */
  text: string;
  icon: "edit" | "hide" | "show" | "section" | "add" | "delete";
  /** «Vedi differenze»: only for the changes of a card (before and after kept). */
  diff?: boolean;
}

const SUBCLASS_ACTIONS: Record<string, string> = { creata: "Creata (nascosta)", corretta: "Corretta", eliminata: "Eliminata" };
const HOMEBREW_ACTIONS: Record<string, string> = { pubblicata: "Pubblicata", creata: "Creata dal Grimorio", corretta: "Corretta", eliminata: "Eliminata", rifiutata: "Proposta rifiutata" };

const EDITOR_TITLES: Record<EditorSection, string> = { incantesimi: "Incantesimi", mostri: "Mostri" };

export default async function LogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!(await isAdmin())) return <AdminLogin />;
  const query = await searchParams;
  // «Tutto · Fatto da me · Aggiornamenti app»; the latest PAGE entries, «Mostra più vecchi» adds PAGE more.
  const who: Who = query.chi === "mio" || query.chi === "app" ? query.chi : "tutto";
  // Kept from the previous log (links and bookmarks): one content only, and the undone changes.
  const keys = ["incantesimi", "mostri", "sezioni", "classi", ...CONTENT_KEYS];
  const sezione = typeof query.sezione === "string" && keys.includes(query.sezione) ? query.sezione : undefined;
  const stato = query.stato === "annullate" ? "annullate" : query.stato === "tutte" ? "tutte" : "attive";
  const limit = Math.min(5000, Math.max(PAGE, Number(query.limite) || PAGE));
  const edition = await adminEdition();
  const allEditions = query.edizioni === "tutte";

  const [overrides, editorRows, sectionRows, cardRows, homebrewRows, subclassRows, spells, monsters] = await Promise.all([
    allOverrides(), allEditorLog(), allSectionLog(), allCardLog(), allHomebrewLog().catch(() => []), allSubclassLog().catch(() => []), getSpellIndex().catch(() => []), getMonsterListIndex().catch(() => []),
  ]);
  const inForce = new Set([...activeOverrideMap(overrides).values()].map(row => row.id));
  const items: LogItem[] = [
    ...overrides.map(row => {
      const section = sectionSpec(row.sezione);
      const edition = isContentEdition(row.edizione) ? row.edizione : undefined;
      const health = edition ? overrideHealth(row, section?.original(row.scheda_id, edition)) : "orphan";
      const active = inForce.has(row.id);
      return {
        id: row.id, editor: false, sezione: row.sezione, when: new Date(row.creata_il), undoneAt: row.annullata_il ? new Date(row.annullata_il) : null, inForce: active,
        title: `${section?.title ?? row.sezione} ${row.edizione}`,
        card: (edition && section?.items(edition).find(item => item.id === row.scheda_id)?.nome) ?? row.scheda_id,
        href: active && section && edition ? `/admin/contenuti/${row.sezione}/${row.scheda_id}?edizione=${edition}` : undefined,
        field: ((edition && fieldLabels(row.sezione, row.scheda_id, edition)[row.campo]) ?? row.campo).toLowerCase(),
        before: row.valore_originale, after: row.valore_nuovo, motivo: row.motivo, ...(health !== "ok" ? { warning: HEALTH[health] } : {}),
        edition: isAdminEdition(row.edizione) ? row.edizione : null,
        text: `Hai modificato «${(edition && section?.items(edition).find(item => item.id === row.scheda_id)?.nome) ?? row.scheda_id}»`, icon: "edit" as const, diff: true,
      };
    }),
    ...editorRows.map(row => {
      // Spells and creatures: the edition the card has now (as in the lists of /admin/incantesimi and /admin/mostri).
      const found = row.sezione === "incantesimi" ? spells.find(spell => spell.id === row.scheda_id) : monsters.find(monster => monster.id === row.scheda_id);
      const cardEdition: AdminEdition | null = !found ? null : found.edizione === "2014" ? "2014" : "2024";
      return {
      id: row.id, editor: true, sezione: row.sezione, when: new Date(row.creata_il), undoneAt: row.annullata_il ? new Date(row.annullata_il) : null, inForce: !row.annullata_il,
      title: `${EDITOR_TITLES[row.sezione]}${cardEdition ? ` ${cardEdition}` : ""} · editor`, edition: cardEdition,
      card: (row.sezione === "incantesimi" ? spellNameOf(spells.find(spell => spell.id === row.scheda_id)) : monsters.find(monster => monster.id === row.scheda_id)?.nome) ?? row.scheda_id,
      href: row.sezione === "incantesimi" ? spellHref(row.scheda_id) : `/mostro/${row.scheda_id}`,
      field: EDITOR_FIELDS[row.sezione].label[row.campo] ?? row.campo.replace(/_/g, " "),
      before: row.valore_prima, after: row.valore_dopo, motivo: "Modifica dall’editor",
      text: `Hai modificato «${(row.sezione === "incantesimi" ? spellNameOf(spells.find(spell => spell.id === row.scheda_id)) : monsters.find(monster => monster.id === row.scheda_id)?.nome) ?? row.scheda_id}»`, icon: "edit" as const, diff: true,
    };
    }),
    // Sections shown or hidden from /admin/sezioni: what the public sees, no content changed.
    ...sectionRows.map(row => ({
      id: row.id, editor: false, sezione: "sezioni", when: new Date(row.creata_il), undoneAt: null, inForce: true,
      title: "Sezioni dell’app", href: "/admin/sezioni",
      card: [isPublicSectionKey(row.sezione) ? publicSection(row.sezione).title : row.sezione, ...(row.parte ? [sectionParts(row.sezione).find(part => part.key === row.parte)?.title ?? row.parte] : [])].join(" · "),
      // Three states: the log keeps the new one («In arrivo» is hidden content with its entries kept).
      field: "visibilità", before: "—", after: !row.nascosta ? "Visibile" : row.in_arrivo ? "In arrivo" : "Nascosta",
      motivo: !row.nascosta ? "Visibile al pubblico." : row.in_arrivo ? "In arrivo: voce attenuata e pagina «in costruzione», contenuto non mostrato." : "Nascosta al pubblico: dati e correzioni restano com’erano.", fixed: "cambio di stato",
      // An edition hidden or shown belongs to that edition; everything else is shared.
      edition: isAdminEdition(row.parte) ? row.parte : null,
      text: `Hai reso «${[isPublicSectionKey(row.sezione) ? publicSection(row.sezione).title : row.sezione, ...(row.parte ? [sectionParts(row.sezione).find(part => part.key === row.parte)?.title ?? row.parte] : [])].join(" · ")}» ${!row.nascosta ? "visibile" : row.in_arrivo ? "in arrivo" : "nascosta"}`, icon: "section" as const,
    })),
    // Single cards shown or hidden with the eye: name and edition as they were at the switch.
    ...cardRows.map(row => {
      const subclass = row.tipo === "sottoclasse";
      const sezione = row.tipo === "incantesimo" ? "incantesimi" : subclass ? "classi" : "mostri";
      const cardEdition = isAdminEdition(row.edizione) ? row.edizione : null;
      return {
        id: row.id, editor: false, sezione, when: new Date(row.creata_il), undoneAt: null, inForce: true,
        title: `${subclass ? "Classi" : EDITOR_TITLES[sezione as EditorSection]}${cardEdition ? ` ${cardEdition}` : ""} · ${subclass ? "sottoclasse · " : ""}visibilità`, edition: cardEdition,
        card: row.nome, href: row.tipo === "incantesimo" ? spellHref(row.scheda) : subclass ? `/classi/${subclassClass(row.scheda)}#sottoclasse` : `/mostro/${row.scheda}`,
        field: "visibilità", before: row.nascosta ? "Visibile" : "Nascosta", after: row.nascosta ? "Nascosta" : "Visibile",
        motivo: row.nascosta ? "Nascosta dal sito: la scheda e i suoi dati restano com’erano." : "Di nuovo visibile sul sito.", fixed: "cambio di stato",
        text: row.nascosta ? `Hai nascosto «${row.nome}»` : `Hai mostrato di nuovo «${row.nome}»`, icon: row.nascosta ? "hide" as const : "show" as const,
      };
    }),
    // Subclasses added by the administrator: created (hidden), corrected, deleted.
    ...subclassRows.map(row => ({
      id: row.id, editor: false, sezione: "classi", when: new Date(row.creata_il), undoneAt: null, inForce: true,
      title: `Classi ${row.edizione} · sottoclasse aggiunta`, edition: isAdminEdition(row.edizione) ? row.edizione : null,
      card: row.nome, href: row.azione === "eliminata" ? undefined : `/admin/contenuti/classi/${row.classe}/sottoclassi/${row.sottoclasse_id}`,
      field: "sottoclasse", before: "—", after: SUBCLASS_ACTIONS[row.azione] ?? row.azione,
      motivo: "Sottoclasse scritta dall’amministratore, non SRD.", fixed: "sottoclasse",
      text: `${row.azione === "creata" ? "Hai creato" : row.azione === "eliminata" ? "Hai eliminato" : "Hai modificato"} la sottoclasse «${row.nome}»`, icon: row.azione === "eliminata" ? "delete" as const : row.azione === "creata" ? "add" as const : "edit" as const,
    })),
    // Homebrew creatures: published from a proposal, created, corrected, deleted, or a proposal refused.
    ...homebrewRows.map(row => {
      const both = row.edizione === "entrambe";
      return {
        id: row.id, editor: false, sezione: "mostri", when: new Date(row.creata_il), undoneAt: null, inForce: true,
        title: `Mostri ${both ? "2014 e 2024" : row.edizione} · homebrew`, edition: both || !isAdminEdition(row.edizione) ? null : row.edizione,
        card: row.nome, href: row.azione === "rifiutata" ? "/admin/proposte?stato=rifiutata" : row.azione === "eliminata" ? undefined : `/mostro/${row.homebrew_id}`,
        field: "homebrew", before: "—", after: HOMEBREW_ACTIONS[row.azione] ?? row.azione,
        motivo: row.azione === "rifiutata" ? "Proposta della community non pubblicata." : "Creatura homebrew, non SRD.", fixed: "homebrew",
        text: `${({ pubblicata: "Hai pubblicato", creata: "Hai creato", corretta: "Hai modificato", eliminata: "Hai eliminato", rifiutata: "Hai rifiutato la proposta" } as Record<string, string>)[row.azione] ?? "Hai cambiato"} «${row.nome}»`,
        icon: row.azione === "eliminata" || row.azione === "rifiutata" ? "delete" as const : row.azione === "corretta" ? "edit" as const : "add" as const,
      };
    }),
  ].sort((a, b) => b.when.getTime() - a.when.getTime());
  const mine = items.filter(item => inAdminEdition(item.edition, edition, allEditions) && (!sezione || item.sezione === sezione)
    && (stato === "tutte" || (stato === "attive" ? item.inForce : !item.inForce)));
  const shown = who === "app" ? [] : mine.slice(0, limit);
  const documented = who === "mio" ? [] : documentedRepairs();
  const href = (next: { chi?: Who; limite?: number; tutte?: boolean; stato?: string }) => {
    const params = new URLSearchParams();
    const chi = next.chi ?? who;
    if (chi !== "tutto") params.set("chi", chi);
    if (sezione) params.set("sezione", sezione);
    const nextState = next.stato ?? stato;
    if (nextState !== "attive") params.set("stato", nextState);
    if (next.limite && next.limite > PAGE) params.set("limite", String(next.limite));
    if (next.tutte ?? allEditions) params.set("edizioni", "tutte");
    return `/admin/registro${params.size ? `?${params}` : ""}`;
  };
  const now = new Date();
  const days = groupByDay(shown, now);
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-3 px-4 pb-10 pt-3 lg:max-w-[960px]">
      <Link href="/admin" className="-ml-2 inline-flex min-h-11 items-center self-start px-2 text-[15px] font-bold text-[#7A1F2B]">‹ Area riservata</Link>
      <h1 className="font-serif text-[32px] font-bold leading-tight text-[#7A1F2B]">Registro</h1>
      <p className="-mt-1 text-[14px] leading-6 text-[#5E4E3E]">Le ultime modifiche, di edizione {edition}{allEditions ? " e di entrambe" : ""} e comuni. I file originali non vengono mai modificati.</p>
      <nav aria-label="Chi ha fatto la modifica" className="flex flex-wrap gap-2">
        {WHO.map(([key, label]) => (
          <Link key={key} href={href({ chi: key })} aria-current={who === key ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border-[1.5px] px-4 text-[15px] font-semibold ${who === key ? "border-[#7A1F2B] bg-[#7A1F2B] text-[#FFFBF0]" : "border-[#DDCFAE] bg-[#FFFBF0] text-[#2B2118]"}`}>{label}</Link>
        ))}
        <Link href={href({ tutte: !allEditions })} className="inline-flex min-h-11 items-center px-2 text-[14px] text-[#5E4E3E] underline underline-offset-4">{allEditions ? `Solo edizione ${edition}` : "Tutte le edizioni"}</Link>
        <Link href={href({ stato: stato === "attive" ? "tutte" : "attive" })} className="inline-flex min-h-11 items-center px-2 text-[14px] text-[#5E4E3E] underline underline-offset-4">{stato === "attive" ? "Tutto lo storico" : "Solo in vigore"}</Link>
      </nav>
      {who !== "app" && (shown.length === 0 ? (
        <p className="rounded-[14px] border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0] px-4 py-6 text-center text-[15px] text-[#5E4E3E]">Nessuna modifica.</p>
      ) : (
        // One list for the whole log (screen readers, tests), one group per day with its heading.
        <div role="list" aria-label="Modifiche" className="flex flex-col gap-3">
          {days.map(day => (
            <div key={day.key} role="group" aria-labelledby={`giorno-${day.key}`}>
              <h2 id={`giorno-${day.key}`} className="px-1 pb-1.5 pt-1 text-[13px] font-bold uppercase tracking-[0.1em] text-[#5E4E3E]">{day.label}</h2>
              <div className="overflow-hidden rounded-[16px] border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0]">
                {day.items.map(item => {
                  const Icon = ICONS[item.icon];
                  return (
                    <div key={item.id} role="listitem" data-log-entry={item.id} className="flex gap-3 border-t border-[#DDCFAE]/70 px-3.5 py-3 first:border-t-0">
                      <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-full ${item.inForce ? "bg-[#F6EFDF] text-[#7A1F2B]" : "bg-[#EDE6D6] text-[#8a7a66]"}`}><Icon size={18} aria-hidden="true" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-[15px] font-semibold leading-snug ${item.inForce ? "" : "text-[#5E4E3E]"}`}>{item.text}</p>
                          <time dateTime={item.when.toISOString()} className="shrink-0 text-[13px] tabular-nums text-[#5E4E3E]">{timeOf(item.when)}</time>
                        </div>
                        <p className="mt-0.5 text-[14px] text-[#2B2118]">{item.href ? <Link href={item.href} className="underline underline-offset-4">{item.card}</Link> : item.card} · {item.field}{item.diff ? "" : ` → ${item.after}`}</p>
                        <p className="mt-0.5 text-[13px] text-[#5E4E3E]">{item.title}{!item.inForce && !item.fixed ? ` · ${item.undoneAt ? `annullata ${formatWhen(item.undoneAt, now)}` : "sostituita"}` : ""}</p>
                        <p className="mt-0.5 break-words text-[13px] text-[#5E4E3E]">{item.motivo}</p>
                        {item.warning && <p className="mt-1 text-[13px] font-semibold text-[#7A1F2B]">{item.warning}</p>}
                        <div className="mt-1 flex flex-wrap items-center gap-x-4">
                          {item.diff && (
                            <details className="w-full" data-log-diff="">
                              <summary className="inline-flex min-h-11 cursor-pointer items-center text-[14px] font-bold text-[#7A1F2B]">Vedi differenze</summary>
                              <p className="mt-1 whitespace-pre-line break-words text-[14px]"><s className="text-[#8a7a66]">{short(item.before) || "—"}</s> → <b>{short(item.after) || "—"}</b></p>
                              <FieldDiff label={item.field} parts={wordDiff(item.before, item.after)} />
                            </details>
                          )}
                          {/* «Annulla» only where the log keeps the value before: corrections and changes of the editors. */}
                          {!item.fixed && item.inForce && <UndoButton id={item.id} editor={item.editor} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
      {who !== "app" && mine.length > shown.length && (
        <Link href={href({ limite: limit + PAGE })} scroll={false} className="inline-flex min-h-12 items-center justify-center self-center rounded-full border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0] px-5 text-[15px] font-bold text-[#7A1F2B]">Mostra più vecchi</Link>
      )}
      {documented.length > 0 && (
        <section aria-labelledby="aggiornamenti-app" className="mt-2">
          <h2 id="aggiornamenti-app" className="px-1 pb-1.5 text-[13px] font-bold uppercase tracking-[0.1em] text-[#5E4E3E]">Aggiornamenti dell’app</h2>
          <p className="px-1 pb-2 text-[13px] text-[#5E4E3E]">Correzioni documentate ({documented.length}, sola lettura): approvate e conservate nei file del progetto, si cambiano solo con una modifica del codice.</p>
          <ul className="overflow-hidden rounded-[16px] border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0]">
            {documented.map((row, i) => (
              <li key={i} data-app-update="" className="flex gap-3 border-t border-[#DDCFAE]/70 px-3.5 py-3 first:border-t-0">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-[#2B2118] text-[#E0A21A]"><Wrench size={17} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold leading-snug">Aggiornamento dell’app: {row.scheda}</p>
                  <p className="text-[13px] text-[#5E4E3E]">{row.sezione} · {row.nota}</p>
                  <details data-log-diff="">
                    <summary className="inline-flex min-h-11 cursor-pointer items-center text-[14px] font-bold text-[#7A1F2B]">Vedi differenze</summary>
                    <FieldDiff label="Testo" parts={wordDiff(row.prima, row.dopo)} />
                  </details>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <a href="/admin/registro/esporta" className="inline-flex min-h-11 items-center self-start text-[14px] font-semibold text-[#7A1F2B] underline underline-offset-4">Esporta correzioni (JSON)</a>
    </main>
  );
}

type Who = "tutto" | "mio" | "app";
const WHO: [Who, string][] = [["tutto", "Tutto"], ["mio", "Fatto da me"], ["app", "Aggiornamenti app"]];
const PAGE = 50;
const CONTENT_KEYS = CONTENT_SECTIONS.map(section => section.key);
const short = (text: string) => (text.length > 280 ? `${text.slice(0, 280).trimEnd()}…` : text);
const ICONS = { edit: Pencil, hide: EyeOff, show: Eye, section: LayoutGrid, add: Plus, delete: Trash2 } as const;
const romeDay = (date: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(date);
const timeOf = (date: Date) => new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" }).format(date);

/** «Oggi», «Ieri», «lunedì 26 ottobre»: the entries of each day, in the Italian time. */
function groupByDay(items: LogItem[], now: Date): { key: string; label: string; items: LogItem[] }[] {
  const today = romeDay(now), yesterday = romeDay(new Date(now.getTime() - 864e5));
  const days = new Map<string, { key: string; label: string; items: LogItem[] }>();
  for (const item of items) {
    const key = romeDay(item.when);
    const label = key === today ? "Oggi" : key === yesterday ? "Ieri"
      : new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", ...(key.slice(0, 4) !== today.slice(0, 4) ? { year: "numeric" } : {}), timeZone: "Europe/Rome" }).format(item.when);
    const day = days.get(key) ?? { key, label, items: [] };
    day.items.push(item);
    days.set(key, day);
  }
  return [...days.values()];
}
