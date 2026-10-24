import type { ReactNode } from "react";
import { ReferenceText, MonsterText } from "@/components/html-text";
import { CardLabels } from "@/components/spell-sheet";
import { abilityMod, type Monster } from "@/lib/monsters-types";
import { conditionLinks, prepareMonsterText, type CardSource } from "@/lib/card-display";
import type { SpellReferenceCatalog } from "@/lib/spell-references";

/**
 * One creature sheet for every source: 2024 and 2014 SRD sheets, sheets made in the
 * reserved area, approved homebrew and the previews of the editor and of the proposals.
 * Order and layout are decided here, the text goes through the display chain of every
 * card (lib/card-display.ts); the stored text is never changed.
 */

/** "17 (armatura naturale)" → value "17", note "armatura naturale". Anything else stays whole. */
export function splitBoxValue(text: string | undefined): { value: string; note?: string } {
  const match = /^\s*([+-]?\d+)\s*\((.+)\)\s*$/.exec(text || "");
  return match ? { value: match[1], note: match[2] } : { value: text || "—" };
}

/** Proficiency bonus from the challenge rating (5e table): +2 up to GS 4, then +1 every 4. */
export function proficiencyFromChallenge(gsNum: number): string | undefined {
  if (!(gsNum >= 0)) return undefined;
  return `+${2 + (Math.max(0, Math.ceil(gsNum) - 1) >> 2)}`;
}

/** "5.900" → "5.900 PE" (also "5.900 PE, o 7.200 nella tana"); a value that already names its unit stays as it is. */
export function experience(px: string): string {
  return /\b(?:PX|PE|XP)\b/i.test(px) ? px : px.replace(/^([\d.]+)/, "$1 PE");
}

/** "13 (10.000 PE; bonus di competenza +5)": GS, experience and proficiency on one line. */
export function challengeDetails(monster: Pick<Monster, "px" | "bonus_competenza" | "gs_num">, legacy: boolean): string {
  const px = (monster.px || "").trim();
  const xp = !px ? "" : experience(px);
  const bonus = monster.bonus_competenza || (legacy ? proficiencyFromChallenge(monster.gs_num) : undefined);
  return [xp, bonus ? `bonus di competenza ${bonus}` : ""].filter(Boolean).join("; ");
}

const PARAGRAPHS = /(?:<br\s*\/?>\s*){2,}/i;
const SPELLCASTING = /^\s*<(?:strong|b)>\s*Incantesimi\b/i;

/** 2014 sheets print spellcasting among the traits: shown after the other actions, as in 2024. */
export function placeLegacySpellcasting(tratti: string, azioni: string): { tratti: string; azioni: string } {
  const parts = (tratti || "").split(PARAGRAPHS);
  const casting = parts.filter(part => SPELLCASTING.test(part));
  if (!casting.length) return { tratti, azioni };
  return {
    tratti: parts.filter(part => !SPELLCASTING.test(part)).join("<br><br>"),
    azioni: [azioni, ...casting].filter(part => part && part.replace(/<[^>]+>/g, "").trim()).join("<br><br>"),
  };
}

function Box({ label, value, note, noteItalic = false, small = false }: { label: string; value: string; note?: string; noteItalic?: boolean; small?: boolean }) {
  return (
    <div className="min-w-0 rounded-[8px] border border-border bg-elevated px-3 py-2.5">
      <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className={small ? "font-serif text-[19px] font-bold leading-6 text-foreground" : "font-serif text-[28px] font-bold leading-8 text-foreground"}>{value}</p>
      {note && <p className={`text-[13px] leading-4 text-muted${noteItalic ? " font-serif italic" : ""}`}>{note}</p>}
    </div>
  );
}

function Line({ label, value, legacy, hidden, damageIcons = false }: { label: string; value?: string; legacy: boolean; hidden: readonly string[]; damageIcons?: boolean }) {
  if (!value) return null;
  return (
    <p className="text-[16px] leading-6 text-foreground">
      <span className="font-bold">{label}</span>{" "}
      <ReferenceText text={value} damageIcons={damageIcons} damageContext={label} references={conditionLinks(legacy, hidden)} />
    </p>
  );
}

type SheetContext = { legacy: boolean; hidden: readonly string[]; catalog?: SpellReferenceCatalog; source?: CardSource };

function Section({ title, html, context }: { title: string; html?: string; context: SheetContext }) {
  if (!html || !html.replace(/<[^>]+>/g, "").trim()) return null;
  const text = prepareMonsterText(html, context.legacy, context.source, context);
  return (
    <section data-monster-section>
      <h2>{title}</h2>
      <MonsterText html={text.html} damageIcons references={text.references} spellReferences={text.spellReferences} />
    </section>
  );
}

/** Title, edition label, 4 px rule and the italic type line. */
/** byline: the author line of a homebrew creature («Proposta da …»), under the type line. */
export function MonsterSheetTitle({ monster, label, before, byline }: { monster: Partial<Monster>; label?: ReactNode; before?: ReactNode; byline?: ReactNode }) {
  const sottotitolo = monster.sottotitolo_fonte || [monster.taglia, monster.tipo, monster.allineamento].filter(Boolean).join(" · ");
  return (
    <header className="px-6">
      {before}
      <div className="flex items-start justify-between gap-3 border-b-4 border-primary pb-2">
        <h1 className="min-w-0 break-words font-serif text-[42px] font-bold leading-[1.05] text-foreground lg:text-[46px]">{monster.nome || "Nome del mostro"}</h1>
        {label && <div className="shrink-0 pt-3">{label}</div>}
        {/* Computer: GS and PE as a bordeaux pill at the top right. */}
        {monster.grado_sfida && (
          <span className="mt-3 hidden shrink-0 items-center rounded-full bg-primary px-3.5 py-1 font-serif text-[17px] font-bold text-primary-foreground lg:inline-flex">
            GS {monster.grado_sfida}{monster.px ? ` · ${experience(monster.px)}` : ""}
          </span>
        )}
      </div>
      {sottotitolo && <p className="mt-2 font-serif text-[19px] italic text-muted">{sottotitolo}</p>}
      {byline && <p className="mt-1 text-[15px] text-muted">{byline}</p>}
      {/* Where the sheet comes from (a homebrew already says it next to the title). */}
      {monster.fonte_scheda !== "Homebrew" && <CardLabels source={monster.fonte_scheda} />}
    </header>
  );
}

/**
 * hidden: what the texts may not link (hidden sections, parts and cards, linksOut); catalog: the spells they
 * link (lib/spell-reference-catalog.ts; the SRD names of the files when missing).
 */
export function MonsterSheetBody({ monster, legacy, hidden = [], catalog }: { monster: Partial<Monster>; legacy: boolean; hidden?: readonly string[]; catalog?: SpellReferenceCatalog }) {
  const context: SheetContext = { legacy, hidden, catalog, source: monster.fonte_scheda };
  const ca = splitBoxValue(monster.classe_armatura);
  const pf = splitBoxValue(monster.punti_ferita);
  // The official initiative keeps its passive value in brackets: "+17" and "(27)" below.
  const official = splitBoxValue(monster.iniziativa);
  const ini = monster.iniziativa
    ? { value: official.value, note: official.note && `(${official.note})` }
    : legacy ? { value: abilityMod(monster.destrezza ?? 10), note: "dalla Destrezza" } : null;
  const { tratti, azioni } = legacy ? placeLegacySpellcasting(monster.tratti || "", monster.azioni || "") : { tratti: monster.tratti, azioni: monster.azioni };
  const gs = monster.grado_sfida;
  const details = challengeDetails({ px: monster.px || "", bonus_competenza: monster.bonus_competenza, gs_num: monster.gs_num ?? -1 }, legacy);
  // Wide card (≥820 px of room, a computer): two columns, statistics and traits on the left, actions on the
  // right; the page width decides, so the phone and the editor preview keep one column.
  return (
    <div className="@container">
    <div className="@[820px]:grid @[820px]:grid-cols-2 @[820px]:items-start">
    <div>
      <div className="grid grid-cols-3 gap-2.5 px-6 pt-5 @[820px]:hidden">
        <Box label="CA" value={ca.value} note={ca.note} />
        <Box label="PF" value={pf.value} note={pf.note} />
        {ini && <Box label="Iniziativa" value={ini.value} note={ini.note} noteItalic={!monster.iniziativa} />}
      </div>
      {monster.velocita && <p className="px-6 pt-3 text-[16px] leading-6 text-foreground @[820px]:hidden"><span className="font-bold">Velocità</span> {monster.velocita}</p>}
      <div className="hidden grid-cols-3 gap-2.5 px-6 pt-5 @[820px]:grid">
        <Box label="CA" value={ca.value} note={[ca.note, ini && `Iniziativa ${ini.value}${ini.note ? ` ${ini.note}` : ""}`].filter(Boolean).join(" · ")} />
        <Box label="PF" value={pf.value} note={pf.note} />
        <Box label="Velocità" value={monster.velocita || "—"} small />
      </div>

      <section data-monster-section className="mt-6">
        <h2>Caratteristiche</h2>
        <div className="grid grid-cols-6 gap-1.5">
          {([["FOR", "forza"], ["DES", "destrezza"], ["COS", "costituzione"], ["INT", "intelligenza"], ["SAG", "saggezza"], ["CAR", "carisma"]] as const).map(([label, key]) => {
            const score = monster[key] ?? 10;
            return (
              <div key={key} className="flex min-w-0 flex-col items-center rounded-[8px] border border-border bg-card py-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{label}</span>
                <span className="font-serif text-[24px] font-bold leading-7 text-foreground">{score}</span>
                <span className="text-[13px] font-semibold text-muted">{abilityMod(score)}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 space-y-1">
          <Line label="Tiri salvezza" value={monster.tiri_salvezza} legacy={legacy} hidden={hidden} />
          <Line label="Abilità" value={monster.abilita} legacy={legacy} hidden={hidden} />
          <Line label="Vulnerabilità" value={monster.vulnerabilita} legacy={legacy} hidden={hidden} damageIcons />
          <Line label="Resistenze" value={monster.resistenze} legacy={legacy} hidden={hidden} damageIcons />
          <Line label="Immunità ai danni" value={monster.immunita_danni} legacy={legacy} hidden={hidden} damageIcons />
          <Line label="Immunità alle condizioni" value={monster.immunita_condizioni} legacy={legacy} hidden={hidden} />
          <Line label="Immunità" value={monster.immunita} legacy={legacy} hidden={hidden} damageIcons />
          <Line label="Equipaggiamento" value={monster.attrezzatura} legacy={legacy} hidden={hidden} />
          <Line label="Sensi" value={monster.sensi} legacy={legacy} hidden={hidden} />
          <Line label="Linguaggi" value={monster.linguaggi} legacy={legacy} hidden={hidden} />
          {gs && (
            <p className="text-[16px] leading-6 text-foreground">
              <span className="font-bold">Grado sfida</span>{" "}
              <span className="font-serif text-[20px] font-bold text-primary">{gs}</span>
              {details && <> ({details})</>}
            </p>
          )}
          {/* Habitat names are plain text, never condition links. */}
          {monster.habitat?.length ? <p className="text-[16px] leading-6 text-foreground"><span className="font-bold">Habitat</span> {monster.habitat.join(", ")}</p> : null}
        </div>
      </section>

      <Section title="Tratti" html={tratti} context={context} />
    </div>
    <div>
      <Section title="Azioni" html={azioni} context={context} />
      <Section title="Azioni bonus" html={monster.azioni_bonus} context={context} />
      <Section title="Reazioni" html={monster.reazioni} context={context} />
      <Section title="Azioni leggendarie" html={monster.azioni_leggendarie} context={context} />
    </div>
    </div>
      <Section title="Descrizione" html={monster.descrizione} context={context} />
    </div>
  );
}
