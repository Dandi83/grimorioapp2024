import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { ClassBlocks } from "@/components/classes/class-blocks";
import { ClassIcon } from "@/components/classes/class-icon";
import { ClassTabs, SubclassPicker } from "@/components/classes/class-editions";
import { AddedSubclassCard, SubclassCard, type AddedTextContext } from "@/components/classes/subclass-card";
import { AdminEditPencil } from "@/components/admin-edit/admin-edit-button";
import { HiddenTag } from "@/components/sections/hidden-tag";
import { castsSpells, CLASS_COLORS, hitDie, levelRows, ofClass, trait, type ClassId, type LevelRow } from "@/lib/classes";
import type { ClassData, ClassEdition, ClassFeature } from "@/lib/classes-types";
import { damageRuleLinks, type RuleTermLinks } from "@/lib/damage-rule-link";
import type { SubclassDraft } from "@/lib/subclass-types";

export const CLASS_SOURCES: Record<ClassEdition, string> = { "2024": "SRD 5.2.1", "2014": "SRD 5.1" };

/** Parts of a class sheet that can be hidden from /admin/sezioni (lib/public-sections.ts). */
export const CLASS_PARTS = ["tab-tabella", "tab-sottoclasse", "abilita", "diventare", "lista-incantesimi", "incantesimi-del"] as const;
export type ClassParts = Record<(typeof CLASS_PARTS)[number], { shown: boolean; hidden: boolean }>;
const ALL_SHOWN = Object.fromEntries(CLASS_PARTS.map(key => [key, { shown: true, hidden: false }])) as ClassParts;

/** Full-width header in the colour of the class. */
export function ClassHeader({ id, name, line }: { id: ClassId; name: string; line: string }) {
  return (
    <header className="px-4 pb-6 pt-3 text-[#FFFBF0] sm:px-6" style={{ background: CLASS_COLORS[id] }}>
      <Link href="/classi" className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-base font-bold text-[#FFFBF0]">
        <span aria-hidden="true" className="text-xl leading-none">‹</span>
        <span>Classi</span>
      </Link>
      <div className="mt-2 flex items-center gap-4">
        <span className="grid size-[60px] shrink-0 place-items-center rounded-[16px] border border-white/45 bg-white/16">
          <ClassIcon id={id} size={32} />
        </span>
        <div className="min-w-0">
          <h1 className="font-serif text-[38px] font-bold leading-[1.05]">{name}</h1>
          <p className="mt-1 text-[14px] font-semibold opacity-90">{line}</p>
        </div>
      </div>
    </header>
  );
}

function KeyCard({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`rounded-[14px] border border-border bg-card p-3 ${wide ? "col-span-2" : ""}`}>
      <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted">{label}</p>
      <div className="mt-1 text-[16px] font-bold leading-snug">{children}</div>
    </div>
  );
}

/** A row that opens: 56 px, the title and an arrow; the content is rendered by the server. */
function Opening({ summary, children, className = "", part }: { summary: ReactNode; children: ReactNode; className?: string; part?: string }) {
  return (
    <details data-part={part} className={`group rounded-[14px] border border-border bg-card ${className}`}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-3 [&::-webkit-details-marker]:hidden">
        {summary}
        <ChevronDown size={20} aria-hidden="true" className="ml-auto shrink-0 text-primary transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-divider px-3 pb-4 pt-3">{children}</div>
    </details>
  );
}

function FeatureText({ feature, rules }: { feature: ClassFeature; rules: RuleTermLinks }) {
  return (
    <section className="space-y-2">
      <h3 className="font-serif text-[20px] font-bold leading-tight text-primary">{feature.titolo}</h3>
      <ClassBlocks blocks={feature.contenuto} rules={rules} />
    </section>
  );
}

function LevelCard({ row, subclass, rules }: { row: LevelRow; subclass: string; rules: RuleTermLinks }) {
  const amber = row.sottoclasse.length > 0;
  const badge = (
    <span className={`grid size-10 shrink-0 place-items-center rounded-[10px] text-center leading-none ${amber ? "bg-amber text-[#2B2118]" : "bg-primary text-primary-foreground"}`}>
      <span><span className="block text-[11px] font-bold tracking-[0.06em]">LIV</span><span className="block text-[17px] font-bold tabular-nums">{row.livello}</span></span>
    </span>
  );
  const names = <span className="min-w-0 py-2 text-[15px] font-semibold leading-snug">{row.nomi}</span>;
  if (!row.privilegi.length && !row.sottoclasse.length) {
    return <li className="flex min-h-14 items-center gap-3 rounded-[14px] border border-border bg-card px-3">{badge}{names}</li>;
  }
  return (
    <li>
      <Opening summary={<>{badge}{names}</>}>
        <div className="space-y-5">
          {row.privilegi.map((feature, i) => <FeatureText key={i} feature={feature} rules={rules} />)}
          {row.sottoclasse.length > 0 && (
            <div className="space-y-4 rounded-[12px] border-2 border-amber p-3">
              <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted">Privilegio della sottoclasse · {subclass}</p>
              {row.sottoclasse.map((feature, i) => <FeatureText key={i} feature={feature} rules={rules} />)}
            </div>
          )}
        </div>
      </Opening>
    </li>
  );
}

function FeaturesTab({ card, id, edition, spellsLink, parts, rules }: { card: ClassData; id: ClassId; edition: ClassEdition; spellsLink: boolean; parts: ClassParts; rules: RuleTermLinks }) {
  const rows = levelRows(card);
  return (
    <div className="space-y-3">
      {card.introPrivilegi?.contenuto.length ? <div className="text-muted"><ClassBlocks blocks={card.introPrivilegi.contenuto} rules={rules} /></div> : null}
      <ol className="space-y-2" aria-label="Livelli 1–5">
        {rows.slice(0, 5).map(row => <LevelCard key={row.livello} row={row} subclass={card.sottoclasse.nome} rules={rules} />)}
      </ol>
      <details className="group">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-center rounded-[14px] border-2 border-dashed border-border px-3 text-[15px] font-bold text-primary [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">Mostra i livelli 6–20</span>
          <span className="hidden group-open:inline">Nascondi i livelli 6–20</span>
        </summary>
        <ol className="mt-2 space-y-2" aria-label="Livelli 6–20">
          {rows.slice(5).map(row => <LevelCard key={row.livello} row={row} subclass={card.sottoclasse.nome} rules={rules} />)}
        </ol>
      </details>
      {card.opzioni.map(option => (
        <Opening key={option.titolo} summary={<span className="font-serif text-[19px] font-bold text-primary">{option.titolo}</span>}>
          <div className="space-y-5">
            <ClassBlocks blocks={option.intro} rules={rules} />
            {option.voci.map(voce => <FeatureText key={voce.titolo} feature={{ livello: 0, titolo: voce.titolo, contenuto: voce.contenuto, pagina: voce.pagina }} rules={rules} />)}
          </div>
        </Opening>
      ))}
      {card.incantesimi && parts["lista-incantesimi"].shown && (
        <Opening part="classi:lista-incantesimi" summary={<span className="font-serif text-[19px] font-bold text-primary">{card.incantesimi.titolo}{parts["lista-incantesimi"].hidden && <HiddenTag className="ml-2" />}</span>}>
          <div className="space-y-4">
            <ClassBlocks blocks={card.incantesimi.intro} rules={rules} />
            {card.incantesimi.livelli.map(level => (
              <section key={level.livello}>
                <h3 className="font-serif text-[18px] font-bold text-primary">{level.titolo}</h3>
                <table className="mt-1 w-full text-[14px] leading-5">
                  <thead><tr className="text-left text-[12px] font-bold uppercase tracking-[0.04em] text-muted"><th scope="col" className="py-1.5 pr-2">Incantesimo</th><th scope="col" className="py-1.5 pr-2">Scuola</th><th scope="col" className="py-1.5">Speciale</th></tr></thead>
                  <tbody>
                    {level.voci.map(voce => (
                      <tr key={voce.nome} className="border-t border-divider align-top">
                        <td className="py-1.5 pr-2 italic">{voce.nome}</td><td className="py-1.5 pr-2">{voce.scuola}</td><td className="py-1.5">{voce.speciale}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
          </div>
        </Opening>
      )}
      {castsSpells(card) && spellsLink && parts["incantesimi-del"].shown && (
        <div data-part="classi:incantesimi-del" className="space-y-1">
          {parts["incantesimi-del"].hidden && <HiddenTag />}
          <Link href={`/grimorio?classe=${id}&edizione=${edition}`} className="flex min-h-12 items-center justify-center rounded-[14px] bg-primary px-4 text-[16px] font-bold text-primary-foreground">
            Incantesimi {ofClass(card.nome)} →
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * The class table as cards for the phone: level and proficiency bonus in the head, the features below, then
 * the other columns as name and value; the grouped columns (spell slots) in one row under their heading.
 */
function TableCards({ table, amber }: { table: ClassData["tabella"]; amber: Set<number> }) {
  const group = table.gruppo;
  // «da» and «a» are the first and last index of the grouped columns (the table header spans them the same way).
  const grouped = (i: number) => !!group && i >= group.da && i <= group.a;
  const groupTitle = group?.testo.replace(/^[—–-]+|[—–-]+$/g, "").trim();
  // The features column («Privilegi di classe», «Privilegi»): plain text under the head, the others with their name.
  const features = table.colonne.findIndex((column, i) => i > 1 && /^privilegi/i.test(column));
  return (
    <ol className="mt-2 flex flex-col gap-2 md:hidden" aria-label={table.titolo}>
      {table.righe.map(row => {
        const sub = amber.has(Number.parseInt(row[0], 10));
        const others = row.map((cell, i) => ({ cell, i })).filter(({ i }) => i > 1 && i !== features && !grouped(i));
        const slots = row.map((cell, i) => ({ cell, i })).filter(({ i }) => grouped(i));
        return (
          <li key={row[0]} className={`rounded-[14px] border px-3.5 py-3 ${sub ? "border-amber bg-[#FBEFCF]" : "border-border bg-card"}`}>
            <p className="flex items-baseline justify-between gap-3">
              <span className="font-serif text-[19px] font-bold text-primary">{table.colonne[0]} {row[0]}</span>
              <span className="text-[14px] text-muted">{table.colonne[1]} <strong className="font-bold tabular-nums text-foreground">{row[1]}</strong></span>
            </p>
            {features > 0 && row[features] && <p className="mt-1 text-[15px] leading-6">{row[features]}</p>}
            {others.length > 0 && (
              <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px]">
                {others.map(({ cell, i }) => (
                  <div key={i} className="flex gap-1.5"><dt className="text-muted">{table.colonne[i]}</dt><dd className="font-bold tabular-nums">{cell}</dd></div>
                ))}
              </dl>
            )}
            {slots.length > 0 && (
              <div className="mt-2">
                <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-muted">{groupTitle}</p>
                <dl className="mt-1 grid gap-1 text-center text-[14px]" style={{ gridTemplateColumns: `repeat(${slots.length}, minmax(0, 1fr))` }}>
                  {slots.map(({ cell, i }) => (
                    <div key={i} className="rounded-[6px] bg-background/70 py-0.5"><dt className="text-[12px] text-muted">{table.colonne[i].replace(/°$/, "")}°</dt><dd className="font-bold tabular-nums">{cell}</dd></div>
                  ))}
                </dl>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function TableTab({ card }: { card: ClassData }) {
  const table = card.tabella;
  const amber = new Set(card.livelliSottoclasse);
  const sticky = "sticky left-0 z-10";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-serif text-[22px] font-bold text-primary">{table.titolo}</h3>
        <span className="hidden text-[13px] font-semibold text-muted md:inline">scorri ⟷</span>
      </div>
      {/* Phones: one card per level, the same cells with their column names; no sideways scrolling. */}
      <TableCards table={table} amber={amber} />
      <div className="mt-2 hidden max-w-full overflow-x-auto rounded-[14px] border border-border bg-card md:block" role="region" tabIndex={0} aria-label={`${table.titolo}, scorribile orizzontalmente`}>
        <table className="min-w-max border-collapse text-[14px] leading-5">
          <thead className="text-left text-[12px] font-bold text-muted">
            {table.gruppo && (
              <tr>
                <th className={`${sticky} bg-card`} />
                <th colSpan={table.gruppo.da - 1} />
                <th colSpan={table.gruppo.a - table.gruppo.da + 1} scope="colgroup" className="px-2 pt-2 text-center">{table.gruppo.testo}</th>
              </tr>
            )}
            <tr className="border-b border-divider">
              {table.colonne.map((column, i) => (
                <th key={i} scope="col" className={`px-2.5 py-2 align-bottom ${i === 0 ? `${sticky} bg-card` : ""} ${i > 2 ? "text-center" : ""}`}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.righe.map(row => {
              const bg = amber.has(Number.parseInt(row[0], 10)) ? "bg-[#FBEFCF]" : "bg-card";
              return (
                <tr key={row[0]} className={`border-t border-divider align-top ${bg}`}>
                  {row.map((cell, i) => i === 0
                    ? <th key={i} scope="row" className={`${sticky} ${bg} px-2.5 py-2 text-left font-bold tabular-nums`}>{cell}</th>
                    : <td key={i} className={`px-2.5 py-2 ${i === 2 ? "min-w-[190px]" : "text-center tabular-nums"}`}>{cell}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 flex items-center gap-2 text-[13px] text-muted">
        <span aria-hidden="true" className="inline-block size-3.5 rounded-[3px] border border-border bg-[#FBEFCF]" />
        Livello con un privilegio della sottoclasse ({card.sottoclasse.nome})
      </p>
    </div>
  );
}

/** A subclass added by the administrator, as the page gets it: hidden ones only for the administrator (labelled). */
interface AddedSubclass { id: string; draft: SubclassDraft; hidden: boolean }

/**
 * The SRD subclass first, then the ones added by the administrator (NO SRD), chosen with the selector above
 * the card; with the SRD one only, the tab is as it was.
 */
function SubclassTab({ card, id, edition, added = [], context, rules }: { card: ClassData; id: ClassId; edition: ClassEdition; added?: AddedSubclass[]; context?: AddedTextContext; rules: RuleTermLinks }) {
  const sub = card.sottoclasse;
  const srd = (
    <SubclassCard name={sub.nome} from={card.livelloSottoclasse} motto={sub.motto?.testo} intro={<ClassBlocks blocks={sub.descrizione} rules={rules} />}
      features={sub.privilegi.map(feature => ({ livello: feature.livello, titolo: feature.titolo, content: <ClassBlocks blocks={feature.contenuto} rules={rules} /> }))} />
  );
  if (!added.length) return srd;
  return (
    <SubclassPicker label={`Sottoclassi ${ofClass(card.nome)}`} idPrefix={`${id}-${edition}-sottoclassi`} options={[
      { key: "srd", label: sub.nome, content: srd },
      ...added.map(item => ({
        key: item.id, label: item.draft.nome, hidden: item.hidden,
        content: <AddedSubclassCard draft={item.draft} from={card.livelloSottoclasse} context={context} hiddenTag={item.hidden ? <HiddenTag /> : undefined}
          edit={<AdminEditPencil target={{ kind: "sottoclasse", id: item.id, edition }} name={item.draft.nome} />} />,
      })),
    ]} />
  );
}

/** The rows of «Abilità ed equipaggiamento iniziale»: the printed traits not shown in the cards above. */
const OPENING_ROWS = [
  ["Abilità", "abilita"], ["Strumenti", "strumenti"], ["Equipaggiamento iniziale", "equipaggiamento"],
  ["Punti ferita al 1° livello", "pf1"], ["Punti ferita ai livelli successivi", "pfDopo"],
] as const;

/** The body of a class sheet for one edition: key data, skills and equipment, the three tabs. */
/** spellsLink: false while the Incantesimi section is hidden; parts: what /admin/sezioni hides in the sheet. */
/** added: the subclasses added by the administrator for this edition; context: what their links may lead to. */
/** hidden: what the links of the printed texts may not lead to (linksOut). */
export function ClassBody({ card, id, edition, spellsLink = true, parts = ALL_SHOWN, added, context, hidden = [] }: { card: ClassData; id: ClassId; edition: ClassEdition; spellsLink?: boolean; parts?: ClassParts; added?: AddedSubclass[]; context?: AddedTextContext; hidden?: readonly string[] }) {
  // «Resistenza», «immunità», «vulnerabilità» of the features linked to the rules of the edition.
  const rules = damageRuleLinks(edition === "2014", hidden);
  const die = hitDie(card);
  const dieRest = trait(card, "dado")?.slice(die?.length ?? 0).trim();
  const primary = trait(card, "primarie");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        <KeyCard label={edition === "2014" ? "Dadi Vita" : "Dado Vita"}>
          <span className="block font-serif text-[28px] leading-none text-primary">{die}</span>
          {dieRest && <span className="mt-1 block text-[13px] font-semibold text-muted">{dieRest}</span>}
        </KeyCard>
        {primary !== undefined && <KeyCard label="Caratteristiche primarie">{primary}</KeyCard>}
        <KeyCard label="Tiri salvezza">{trait(card, "tiri")}</KeyCard>
        <KeyCard label="Armi">{trait(card, "armi")}</KeyCard>
        <KeyCard label="Armature" wide>{trait(card, "armature")}</KeyCard>
      </div>
      {parts.abilita.shown && <Opening part="classi:abilita" summary={<span className="text-[16px] font-bold">Abilità ed equipaggiamento iniziale{parts.abilita.hidden && <HiddenTag className="ml-2" />}</span>}>
        <dl className="space-y-3 text-[15px] leading-6">
          {OPENING_ROWS.map(([label, key]) => {
            const value = trait(card, key);
            return value ? (
              <div key={key}>
                <dt className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted">{label}</dt>
                <dd><ClassBlocks blocks={[{ tipo: "p", testo: value }]} rules={rules} /></dd>
              </div>
            ) : null;
          })}
        </dl>
      </Opening>}
      {card.diventare && parts.diventare.shown && (
        <Opening part="classi:diventare" summary={<span className="text-[16px] font-bold">{card.diventare.titolo}{parts.diventare.hidden && <HiddenTag className="ml-2" />}</span>}>
          <div className="space-y-4">
            {card.diventare.parti.map(part => (
              <section key={part.titolo} className="space-y-1.5">
                <h3 className="font-serif text-[18px] font-bold text-primary">{part.titolo}</h3>
                <ClassBlocks blocks={part.contenuto} rules={rules} />
              </section>
            ))}
          </div>
        </Opening>
      )}
      <ClassTabs label={`Contenuto ${ofClass(card.nome)}`} idPrefix={`${id}-${edition}`} tabs={[
        { key: "privilegi", label: "Privilegi", content: <FeaturesTab card={card} id={id} edition={edition} spellsLink={spellsLink} parts={parts} rules={rules} /> },
        ...(parts["tab-tabella"].shown ? [{ key: "tabella", label: "Tabella", content: <TableTab card={card} />, part: "classi:tab-tabella", hidden: parts["tab-tabella"].hidden }] : []),
        ...(parts["tab-sottoclasse"].shown ? [{ key: "sottoclasse", label: "Sottoclasse", content: <SubclassTab card={card} id={id} edition={edition} added={added} context={context} rules={rules} />, part: "classi:tab-sottoclasse", hidden: parts["tab-sottoclasse"].hidden }] : []),
      ]} />
    </div>
  );
}
