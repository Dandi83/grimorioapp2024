import Link from "next/link";

import { AdminLogin } from "@/components/admin-login";
import { UndoButton } from "@/components/admin-content/undo-button";
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

export const dynamic = "force-dynamic";
export const metadata = { title: "Registro modifiche — Il Grimorio.App", robots: { index: false, follow: false } };

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
}

const short = (text: string) => (text.length > 280 ? `${text.slice(0, 280).trimEnd()}…` : text);
const EDITOR_TITLES: Record<EditorSection, string> = { incantesimi: "Incantesimi", mostri: "Mostri" };

export default async function LogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!(await isAdmin())) return <AdminLogin />;
  const query = await searchParams;
  const keys = [...CONTENT_SECTIONS.map(section => section.key), "incantesimi", "mostri", "sezioni"];
  const sezione = typeof query.sezione === "string" && keys.includes(query.sezione) ? query.sezione : undefined;
  const stato = query.stato === "annullate" ? "annullate" : query.stato === "tutte" ? "tutte" : "attive";
  const edition = await adminEdition();
  const allEditions = query.edizioni === "tutte";

  const [overrides, editorRows, sectionRows, cardRows, spells, monsters] = await Promise.all([
    allOverrides(), allEditorLog(), allSectionLog(), allCardLog(), getSpellIndex().catch(() => []), getMonsterListIndex().catch(() => []),
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
      href: row.sezione === "incantesimi" ? `/spell/${row.scheda_id}` : `/mostro/${row.scheda_id}`,
      field: EDITOR_FIELDS[row.sezione].label[row.campo] ?? row.campo.replace(/_/g, " "),
      before: row.valore_prima, after: row.valore_dopo, motivo: "Modifica dall’editor",
    };
    }),
    // Sections shown or hidden from /admin/sezioni: what the public sees, no content changed.
    ...sectionRows.map(row => ({
      id: row.id, editor: false, sezione: "sezioni", when: new Date(row.creata_il), undoneAt: null, inForce: true,
      title: "Sezioni dell’app", href: "/admin/sezioni",
      card: [isPublicSectionKey(row.sezione) ? publicSection(row.sezione).title : row.sezione, ...(row.parte ? [sectionParts(row.sezione).find(part => part.key === row.parte)?.title ?? row.parte] : [])].join(" · "),
      field: "visibilità", before: row.nascosta ? "Visibile" : "Nascosta", after: row.nascosta ? "Nascosta" : "Visibile",
      motivo: row.nascosta ? "Nascosta al pubblico: dati e correzioni restano com’erano." : "Di nuovo visibile al pubblico.", fixed: "cambio di stato",
      // An edition hidden or shown belongs to that edition; everything else is shared.
      edition: isAdminEdition(row.parte) ? row.parte : null,
    })),
    // Single cards shown or hidden with the eye: name and edition as they were at the switch.
    ...cardRows.map(row => {
      const sezione = row.tipo === "incantesimo" ? "incantesimi" : "mostri";
      const cardEdition = isAdminEdition(row.edizione) ? row.edizione : null;
      return {
        id: row.id, editor: false, sezione, when: new Date(row.creata_il), undoneAt: null, inForce: true,
        title: `${EDITOR_TITLES[sezione]}${cardEdition ? ` ${cardEdition}` : ""} · visibilità`, edition: cardEdition,
        card: row.nome, href: row.tipo === "incantesimo" ? `/spell/${row.scheda}` : `/mostro/${row.scheda}`,
        field: "visibilità", before: row.nascosta ? "Visibile" : "Nascosta", after: row.nascosta ? "Nascosta" : "Visibile",
        motivo: row.nascosta ? "Nascosta dal sito: la scheda e i suoi dati restano com’erano." : "Di nuovo visibile sul sito.", fixed: "cambio di stato",
      };
    }),
  ].sort((a, b) => b.when.getTime() - a.when.getTime());
  const shown = items.filter(item => inAdminEdition(item.edition, edition, allEditions) && (!sezione || item.sezione === sezione) && (stato === "tutte" || (stato === "attive" ? item.inForce : !item.inForce)));

  const href = (next: { sezione?: string; stato?: string; tutte?: boolean }) => {
    const params = new URLSearchParams();
    const s = "sezione" in next ? next.sezione : sezione;
    const t = next.stato ?? stato;
    if (s) params.set("sezione", s);
    if (t !== "attive") params.set("stato", t);
    if (next.tutte ?? allEditions) params.set("edizioni", "tutte");
    return `/admin/registro${params.size ? `?${params}` : ""}`;
  };
  const pill = (on: boolean) => `inline-flex min-h-11 shrink-0 items-center rounded-[22px] border-[1.5px] px-3.5 text-sm font-semibold ${on ? "border-primary bg-primary text-primary-foreground" : "border-chip-border bg-card text-primary"}`;
  const filters = [{ key: "incantesimi", title: "Incantesimi" }, { key: "mostri", title: "Mostri" }, ...CONTENT_SECTIONS.map(section => ({ key: section.key, title: section.title })), { key: "sezioni", title: "Sezioni dell’app" }];
  const now = new Date();
  const documented = documentedRepairs();
  return (
    <div className="mx-auto flex max-w-2xl lg:max-w-[1200px] flex-col gap-3 px-4 pb-8 pt-4">
      <Link href="/admin" className="inline-flex min-h-11 items-center self-start text-[15px] font-bold text-primary">‹ Amministrazione</Link>
      <h1 className="font-serif text-[30px] font-bold text-primary">Registro modifiche</h1>
      <p className="text-sm text-muted">Tutto ciò che è diverso dal manuale originale, con motivo e possibilità di annullare. I file originali non vengono mai modificati; incantesimi e mostri sono schede del database e qui c’è il valore precedente di ogni modifica.</p>
      <nav aria-label="Edizioni" className="flex gap-2">
        <Link href={href({ tutte: false })} aria-current={!allEditions ? "page" : undefined} className={pill(!allEditions)}>Solo edizione {edition}</Link>
        <Link href={href({ tutte: true })} aria-current={allEditions ? "page" : undefined} className={pill(allEditions)}>Tutte le edizioni</Link>
      </nav>
      <nav aria-label="Sezione" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <Link href={href({ sezione: undefined })} className={pill(!sezione)} aria-current={!sezione ? "page" : undefined}>Tutte</Link>
        {filters.map(filter => <Link key={filter.key} href={href({ sezione: filter.key })} className={pill(sezione === filter.key)} aria-current={sezione === filter.key ? "page" : undefined}>{filter.title}</Link>)}
      </nav>
      <nav aria-label="Stato" className="flex gap-2">
        {[["attive", "In vigore"], ["annullate", "Annullate"], ["tutte", "Tutto lo storico"]].map(([value, label]) => (
          <Link key={value} href={href({ stato: value })} aria-current={stato === value ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-[18px] px-3.5 text-sm ${stato === value ? "bg-foreground font-semibold text-background" : "bg-elevated text-muted"}`}>{label}</Link>
        ))}
      </nav>
      {shown.length === 0 ? (
        <p className="rounded-[14px] border-[1.5px] border-border bg-card px-4 py-6 text-center text-[15px] text-muted">Nessuna modifica.</p>
      ) : (
        <ul className="overflow-hidden rounded-[14px] border-[1.5px] border-border bg-card" aria-label="Modifiche">
          {shown.map(item => (
            <li key={item.id} className="border-t border-elevated px-3.5 py-3 first:border-t-0">
              <div className="flex items-start justify-between gap-2 text-xs text-muted">
                <span>{formatWhen(item.when, now)} · {item.title}</span>
                {item.fixed ? <span>{item.fixed}</span> : item.inForce ? <UndoButton id={item.id} editor={item.editor} /> : <span>{item.undoneAt ? `annullata ${formatWhen(item.undoneAt, now)}` : "sostituita"}</span>}
              </div>
              <p className="mt-0.5 text-[15px] font-bold">
                {item.href ? <Link href={item.href} className="underline underline-offset-4">{item.card}</Link> : item.card} · {item.field}
              </p>
              <p className="mt-0.5 whitespace-pre-line break-words text-sm"><s className="text-[#8a7a66]">{short(item.before) || "—"}</s> → <b>{short(item.after) || "—"}</b></p>
              <p className="mt-0.5 break-words text-[13px] text-muted">{item.motivo}</p>
              {item.warning && <p className="mt-1 text-[13px] font-semibold text-primary">{item.warning}</p>}
            </li>
          ))}
        </ul>
      )}
      <a href="/admin/registro/esporta" className="inline-flex min-h-11 items-center self-start rounded-[22px] border-[1.5px] border-primary px-4 text-sm font-bold text-primary">Esporta correzioni (JSON)</a>
      <details className="rounded-[14px] border border-border bg-card p-3.5">
        <summary className="min-h-11 cursor-pointer content-center text-[15px] font-bold">Correzioni documentate ({documented.length}, sola lettura)</summary>
        <p className="mt-1 text-[13px] text-muted">Approvate prima del registro e conservate nei file *-repairs-*.json del progetto: si cambiano solo con una modifica del codice.</p>
        <ul className="mt-2 space-y-2">
          {documented.map((row, i) => (
            <li key={i} className="border-t border-elevated pt-2 text-[13px]">
              <span className="text-muted">{row.sezione} · {row.scheda}</span>
              <span className="block break-words"><s className="text-[#8a7a66]">{row.prima}</s> → <b>{row.dopo}</b></span>
              <span className="block text-muted">{row.nota}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
