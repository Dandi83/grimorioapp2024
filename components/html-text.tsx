import { Fragment, type ReactNode } from "react";
// Relative path: the test harnesses load this file without the "@/" alias.
import spellIndex from "../lib/data/spell-reference-index.json";
import { findRuleTerms, type RuleTermLinks } from "../lib/damage-rule-link";
import { normalizeLayout } from "../lib/display-layout";

/**
 * Minimal, safe renderer for spell descriptions.
 * Supports <b>/<strong>, <i>/<em>, <br> and common HTML entities.
 * We never use dangerouslySetInnerHTML: the string is tokenized and rebuilt
 * into React nodes, so untrusted markup can only ever become plain text.
 */

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

function decodeEntities(s: string): string {
  return s.replace(/&[a-zA-Z#0-9]+;/g, (m) => ENTITIES[m] ?? m);
}

const TAG_RE = /<\s*(\/?)\s*([a-zA-Z0-9]+)\s*(\/?)\s*>/g;
const SLOT_HEADING_RE = new RegExp(
  "Utilizzo di uno slot incantesimo di livello superiore"
    .split(" ")
    .join("(?:\\s|&nbsp;|<br\\s*\\/?>|<\\/?(?:b|strong|i|em)>)+") +
    "(?:<\\/(?:b|strong|i|em)>)*[.:]?",
  "gi",
);

const DAMAGE_TYPES: Record<string, string> = {
  fuoco: "fire", freddo: "cold", ghiaccio: "cold", fulmine: "lightning", tuono: "thunder",
  veleno: "poison", acido: "acid", forza: "force", necrotico: "necrotic", necrotici: "necrotic",
  radiante: "radiant", radianti: "radiant", psichico: "psychic", psichici: "psychic",
  contundente: "bludgeoning", contundenti: "bludgeoning", perforante: "piercing", perforanti: "piercing",
  tagliente: "slashing", taglienti: "slashing",
};
const DAMAGE_WORDS = new RegExp(`\\b(${Object.keys(DAMAGE_TYPES).map(word => word.split("").join("(?:-\\s*\\n\\s*)?")).join("|")})\\b`, "gi");

/** Inline decoration shared by prose and labelled monster damage lists. */
export function DamageText({ text, context = "", precedingText = "", softLineBreaks = false }: { text: string; context?: string; precedingText?: string; softLineBreaks?: boolean }) {
  const decorated: ReactNode[] = [];
  let end = 0;
  for (const match of text.matchAll(DAMAGE_WORDS)) {
    const preceding = precedingText + text.slice(0, match.index);
    const sentence = (softLineBreaks ? preceding.replace(/\n/g, " ") : preceding).split(/[.!?;\n]/).pop() || "";
    const before = `${context} ${sentence}`;
    // A damage label may sit outside the value; ability checks and narrative uses stay plain.
    const damageContext = before.match(/\b(?:dann[oi]|resistenz[ae]|immunit[àa]|vulnerabilit[àa])(?=\s|[,:;]|$)[^.!?;\n]{0,180}$/i);
    if (!damageContext || /\b(?:tiro|prova|punteggio|caratteristica|modificatore|muro)\b/i.test(damageContext[0])) continue;
    decorated.push(text.slice(end, match.index));
    const type = DAMAGE_TYPES[match[0].replace(/-\s*\n\s*/g, "").toLowerCase()];
    decorated.push(<span key={match.index} data-damage-type={type} className={match[0].includes("\n") ? undefined : "inline-block whitespace-nowrap"}>{match[0]}<img src={`/damage-icons/${type}.png`} alt="" aria-hidden="true" title={`Danni: ${match[0]}`} width={18} height={18} className="ml-1 inline-block h-[18px] w-[18px] align-[-3px] object-contain" /></span>);
    end = match.index + match[0].length;
  }
  decorated.push(text.slice(end));
  return <>{decorated}</>;
}

// Game formulas shown the same way on every sheet, whatever italics the source had.
const RULE_LABEL = new RegExp(
  "(?<![\\p{L}])(?:" + [
    "Tiro per colpire (?:in mischia o a distanza|in mischia|a distanza)",
    "Attacco con (?:arma|incantesimo) (?:da mischia o (?:con arma )?a distanza|da mischia|a distanza)",
    "Attacco (?:in mischia|a distanza) con (?:arma|incantesimo)",
    "Colpito o mancato", "Colpito", "Mancato",
    "(?:Esito\\s*[-–]\\s*)?Tiro salvezza su (?:Forza|Destrezza|Costituzione|Intelligenza|Saggezza|Carisma)",
    "Tiro salvezza (?:fallito|superato)",
    "Fallimento o successo", "Fallimento di \\d+ o più", "(?:Primo|Secondo|Terzo) fallimento", "Fallimenti successivi",
    "Fallimento", "Successo", "Attivazione", "Esito", "Effetti aggiuntivi", "Utilizzi di azioni leggendarie",
  ].join("|") + ")\\s*:",
  "gu",
);

const normalizeName = (text: string) => text.toLocaleLowerCase("it").replace(/\s+/g, " ").trim();
const SPELL_NAMES = new Set(spellIndex.map(spell => normalizeName(spell.name)));

/**
 * True when italic text is only catalog spell names, e.g. "Cono di freddo, volare", "palla di fuoco (di 4º livello)"
 * or "armatura magica*". known: the spells this text links (cards of the database too, see lib/spell-reference-catalog.ts).
 */
function isSpellNameText(text: string, known: ReadonlySet<string>) {
  const parts = text.replace(/\([^)]*\)/g, " ").split(/[,;]/).map(part => normalizeName(part).replace(/\*+$/, "").replace(/[.!:]$/, "").trim()).filter(Boolean);
  return parts.length > 0 && parts.every(part => SPELL_NAMES.has(part) || known.has(part));
}

/**
 * One emphasis style for every sheet: italics only on spell names and game formulas.
 * Other italics in the source (imported or typed in the admin area) are shown as plain text.
 */
// A casting-list line: "1° livello (4 slot):", "A volontà:", "3/giorno ciascuno:"...
const CASTING_LINE = /^\s*(?:Trucchetti\b[^:]*|\d+°\s*livello[^:]*|A volontà|\d+\s*\/\s*giorno[^:]*|\d+ volte al giorno[^:]*):/i;

function normalizeEmphasis(html: string, known: ReadonlySet<string> = new Set()) {
  return html
    .replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, (_whole, _tag, inner: string, offset: number, source: string) => {
      // Italics in a casting list are spell names even when the 2014 name differs from the catalog.
      const line = source.slice(0, offset).split(/<br\s*\/?>/i).pop()!.replace(/<[^>]+>/g, "");
      // A grouped list (label on its own line, see MonsterText) starts the paragraph with the label.
      const group = CASTING_LINE.test(source.replace(/<[^>]+>/g, ""));
      const spells = CASTING_LINE.test(line) || group || isSpellNameText(decodeEntities(inner.replace(/<[^>]+>/g, " ")), known);
      return spells ? `<spellname>${inner}</spellname>` : inner;
    })
    .replace(/<\s*\/?\s*(?:em|i)\s*>/gi, "")
    .replace(/(^|>)([^<]*)/g, (_whole, edge: string, text: string) => edge + text.replace(RULE_LABEL, "<rulelabel>$&</rulelabel>"));
}

type InlineReference = { label: string; href: string };
/** A place of the text linked to a rule (lib/damage-rule-link.ts): offsets in the text, destination. */
type RuleLink = { start: number; end: number; href: string };
/** rules: where «resistenza», «immunità» and «vulnerabilità» lead for the edition of the card (lib/damage-rule-link.ts). */
type HtmlTextProps = { html: string; damageIcons?: boolean; references?: readonly InlineReference[]; spellReferences?: readonly InlineReference[]; rules?: RuleTermLinks };


/** Preserve source text while adding accessible inline links and damage icons. ruleLinks: rule terms found in the paragraph. */
export function ReferenceText({ text, damageIcons = false, precedingText = "", references = [], damageContext = "", softLineBreaks = false, ruleLinks = [] }: {
  text: string; damageIcons?: boolean; precedingText?: string; references?: readonly InlineReference[]; damageContext?: string; softLineBreaks?: boolean; ruleLinks?: readonly RuleLink[];
}) {
  const renderText = (part: string, offset: number) => damageIcons
    ? <DamageText text={part} precedingText={precedingText + text.slice(0, offset)} context={damageContext} softLineBreaks={softLineBreaks} />
    : part;
  if (!references.length && !ruleLinks.length) return <>{renderText(text, 0)}</>;
  const links: (RuleLink & { rule?: boolean })[] = [];
  if (references.length) {
    const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const labels = [...references].sort((a, b) => b.label.length - a.label.length).map(reference => reference.label.split(/\s+/).map(word => [...word].map(escape).join("(?:-\\s*\\n\\s*)?")).join("\\s+"));
    const matcher = new RegExp(`(?<![\\p{L}\\p{N}_])(${labels.join("|")})(?![\\p{L}\\p{N}_])`, "giu");
    for (const match of text.matchAll(matcher)) {
      const label = match[0].replace(/-\s*\n\s*/g, "").replace(/\s+/g, " ").toLowerCase();
      links.push({ start: match.index, end: match.index + match[0].length, href: references.find(item => item.label.toLowerCase() === label)!.href });
    }
  }
  // A rule term never sits inside a condition or spell name; if it did, the name wins.
  for (const link of ruleLinks) if (!links.some(other => link.start < other.end && other.start < link.end)) links.push({ ...link, rule: true });
  links.sort((a, b) => a.start - b.start);
  const nodes: ReactNode[] = [];
  let end = 0;
  for (const link of links) {
    nodes.push(<Fragment key={`text-${link.start}`}>{renderText(text.slice(end, link.start), end)}</Fragment>);
    nodes.push(<a key={`link-${link.start}`} href={link.href} className="ref-pill" data-rule-term={link.rule ? "" : undefined}>{text.slice(link.start, link.end)}</a>);
    end = link.end;
  }
  nodes.push(<Fragment key="tail">{renderText(text.slice(end), end)}</Fragment>);
  return <>{nodes}</>;
}

/** The text runs of a paragraph between its tags, as plain text, and whether each is a spell name. */
function textRuns(source: string) {
  const runs: { start: number; end: number; spell: boolean }[] = [];
  const stack: string[] = [];
  let plain = "";
  let last = 0;
  const add = (text: string) => {
    const decoded = decodeEntities(text);
    runs.push({ start: plain.length, end: plain.length + decoded.length, spell: stack.includes("spellname") });
    plain += decoded;
  };
  for (const m of source.matchAll(TAG_RE)) {
    if (m.index > last) add(source.slice(last, m.index));
    const tag = m[2].toLowerCase();
    if (m[3] || tag === "br") { if (tag === "br") plain += "\n"; }
    else if (m[1]) { const idx = stack.lastIndexOf(tag); if (idx >= 0) stack.splice(idx, 1); }
    else stack.push(tag);
    last = m.index + m[0].length;
  }
  if (last < source.length) add(source.slice(last));
  return { plain, runs };
}

function InlineHtmlText({ html, damageIcons = false, references = [], spellReferences = [], rules }: HtmlTextProps) {
  const nodes: ReactNode[] = [];
  const stack: string[] = [];
  let key = 0;
  let last = 0;
  let plainEmitted = "";

  const source = normalizeEmphasis(html || "", new Set(spellReferences.map(reference => normalizeName(reference.label))));
  // Rule terms of the whole paragraph (one per term), each inside one run of text that is not a spell name.
  const { plain, runs } = textRuns(source);
  const ruleSpots = findRuleTerms(plain, rules, (start, end) => !runs.some(run => !run.spell && run.start <= start && end <= run.end));

  const emit = (text: string) => {
    const decoded = decodeEntities(text);
    if (!decoded) return;
    const bold = stack.includes("b") || stack.includes("strong");
    const italic = stack.includes("spellname");
    const rule = stack.includes("rulelabel");
    const from = plainEmitted.length;
    const ruleLinks = ruleSpots.filter(spot => spot.start >= from && spot.end <= from + decoded.length)
      .map(spot => ({ start: spot.start - from, end: spot.end - from, href: spot.href }));
    const content = <ReferenceText text={decoded} damageIcons={damageIcons} precedingText={plainEmitted} references={italic ? [...references, ...spellReferences] : references} ruleLinks={ruleLinks} />;
    plainEmitted += decoded;
    const className = [
      bold ? "font-semibold text-primary" : "",
      italic ? "italic" : "",
      rule && !bold ? "italic text-foreground" : "",
    ]
      .filter(Boolean)
      .join(" ");
    nodes.push(
      className ? (
        <span key={key++} className={className}>
          {content}
        </span>
      ) : (
        <Fragment key={key++}>{content}</Fragment>
      ),
    );
  };

  let m: RegExpExecArray | null;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(source)) !== null) {
    if (m.index > last) emit(source.slice(last, m.index));
    const isClose = !!m[1];
    const tag = m[2].toLowerCase();
    const isSelf = !!m[3] || tag === "br";
    if (isSelf) {
      if (tag === "br") { nodes.push(<br key={key++} />); plainEmitted += "\n"; }
    } else if (isClose) {
      const idx = stack.lastIndexOf(tag);
      if (idx >= 0) stack.splice(idx, 1);
    } else {
      stack.push(tag);
    }
    last = m.index + m[0].length;
  }
  if (last < source.length) emit(source.slice(last));

  return (
    <p className="font-serif text-[1.05rem] leading-7 text-card-foreground">
      {nodes}
    </p>
  );
}

function SpellProse({ html, damageIcons = false, references = [], spellReferences = [], rules }: HtmlTextProps) {
  const matches = [...html.matchAll(SLOT_HEADING_RE)];
  if (matches.length === 0) return <InlineHtmlText html={html} damageIcons={damageIcons} references={references} spellReferences={spellReferences} rules={rules} />;

  const sections: ReactNode[] = [];
  let last = 0;
  const addProse = (part: string) => {
    const text = part.replace(/^(?:\s|<br\s*\/?>)+|(?:\s|<br\s*\/?>)+$/gi, "");
    if (text.replace(/<[^>]+>/g, "").trim()) {
      sections.push(<InlineHtmlText key={sections.length} html={text} damageIcons={damageIcons} references={references} spellReferences={spellReferences} rules={rules} />);
    }
  };
  for (const match of matches) {
    addProse(html.slice(last, match.index));
    const title = decodeEntities(match[0].replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .replace(/\s+([.:])/g, "$1")
      .trim();
    sections.push(
      <h3 key={sections.length} className="mb-2 mt-6 font-serif text-lg font-semibold leading-6 text-primary first:mt-0">
        {title}
      </h3>,
    );
    last = match.index + match[0].length;
  }
  addProse(html.slice(last));
  return <div className="min-w-0 max-w-full">{sections}</div>;
}

/** Preserve the source tables without allowing attributes or executable markup. The layout of the PDF is repaired first (lib/display-layout.ts). */
export function HtmlText({ html: source, damageIcons = false, references = [], spellReferences = [], rules }: HtmlTextProps) {
  const html = normalizeLayout(source || "");
  if (!html.includes("<pre>")) return <SpellProse html={html || ""} damageIcons={damageIcons} references={references} spellReferences={spellReferences} rules={rules} />;
  const parts = html.split(/(<pre>[\s\S]*?<\/pre>)/g);
  return (
    <div className="min-w-0 max-w-full space-y-5">
      {parts.map((part, index) => {
        if (part.startsWith("<pre>") && part.endsWith("</pre>")) {
          return (
            <pre
              key={index}
              tabIndex={0}
              aria-label="Tabella dell’incantesimo, scorribile orizzontalmente"
              className="max-w-full overflow-x-auto rounded-xl border border-border bg-card p-3 font-mono text-[12px] leading-5 text-card-foreground"
            >
              {<ReferenceText text={decodeEntities(part.slice(5, -6))} damageIcons={damageIcons} references={references} softLineBreaks />}
            </pre>
          );
        }
        const text = part.replace(/^(?:<br>)+|(?:<br>)+$/g, "");
        return text ? <SpellProse key={index} html={text} damageIcons={damageIcons} references={references} spellReferences={spellReferences} rules={rules} /> : null;
      })}
    </div>
  );
}

/** Creature stat blocks: the layout of the PDF repaired (lib/display-layout.ts, e.g. a bold title split by a page), then one paragraph per block. */
export function MonsterText({ html: source, ...props }: HtmlTextProps) {
  if (!source) return null;
  const html = normalizeLayout(source);
  if (html.includes("<pre>")) return <HtmlText html={html} {...props} />;
  let formatted = html;
  // 2014 casting lists print their labels in plain text at the start of a line ("1° livello (4 slot):"):
  // shown in bold like the 2024 labels, so every sheet groups its spell lists the same way.
  formatted = formatted.replace(/(^|<br\s*\/?>)\s*((?:Trucchetti\s*\(a volontà\)|\d+°\s*livello\s*\([^)<]*\)|A\s+volontà|\d+\s*\/\s*giorno(?:\s+ciascuno)?|\d+\s+volte\s+al\s+giorno[^:<]*):)\s*/gi, "$1<strong>$2</strong> ");
  formatted = formatted.replace(/(<(strong|b)>\s*(?:\d+\s*\/\s*(?:giorno|riposo)[^<:]*|A\s+volontà|Trucchetti[^<:]*|\d+°\s*livello[^<:]*)\s*:\s*<\/\2>)/gi, "<br><br>$1<br>");
  const paragraphs = formatted.split(/(?:<br\s*\/?>\s*){2,}/gi).filter(part => part.replace(/<[^>]+>/g, "").trim());
  return <div className="min-w-0 space-y-4">{paragraphs.map((part, index) => {
    const frequency = /^\s*<(?:strong|b)>\s*(?:\d+\s*\/|A\s+volontà|Trucchetti|\d+°\s*livello)/i.test(part);
    return <div key={index} data-spell-frequency={frequency ? "true" : undefined} className={frequency ? "border-l-[3px] border-primary pl-3" : undefined}><HtmlText html={part} {...props} /></div>;
  })}</div>;
}
