import { Fragment, type ReactNode } from "react";

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

type InlineReference = { label: string; href: string };
type HtmlTextProps = { html: string; damageIcons?: boolean; references?: readonly InlineReference[] };


/** Preserve source text while adding accessible inline links and damage icons. */
export function ReferenceText({ text, damageIcons = false, precedingText = "", references = [], damageContext = "", softLineBreaks = false }: {
  text: string; damageIcons?: boolean; precedingText?: string; references?: readonly InlineReference[]; damageContext?: string; softLineBreaks?: boolean;
}) {
  const renderText = (part: string, offset: number) => damageIcons
    ? <DamageText text={part} precedingText={precedingText + text.slice(0, offset)} context={damageContext} softLineBreaks={softLineBreaks} />
    : part;
  if (!references.length) return <>{renderText(text, 0)}</>;
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const labels = references.map(reference => reference.label.split(/\s+/).map(word => [...word].map(escape).join("(?:-\\s*\\n\\s*)?")).join("\\s+"));
  const matcher = new RegExp(`\\b(${labels.join("|")})\\b`, "gi");
  const nodes: ReactNode[] = [];
  let end = 0;
  for (const match of text.matchAll(matcher)) {
    nodes.push(<Fragment key={`text-${match.index}`}>{renderText(text.slice(end, match.index), end)}</Fragment>);
    const label = match[0].replace(/-\s*\n\s*/g, "").replace(/\s+/g, " ").toLowerCase();
    const reference = references.find(item => item.label.toLowerCase() === label)!;
    nodes.push(<a key={`link-${match.index}`} href={reference.href} className="underline decoration-primary/70 underline-offset-4 hover:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-primary">{match[0]}</a>);
    end = match.index + match[0].length;
  }
  nodes.push(<Fragment key="tail">{renderText(text.slice(end), end)}</Fragment>);
  return <>{nodes}</>;
}

function InlineHtmlText({ html, damageIcons = false, references = [] }: HtmlTextProps) {
  const nodes: ReactNode[] = [];
  const stack: string[] = [];
  let key = 0;
  let last = 0;
  let plainEmitted = "";

  const emit = (text: string) => {
    const decoded = decodeEntities(text);
    if (!decoded) return;
    const content = <ReferenceText text={decoded} damageIcons={damageIcons} precedingText={plainEmitted} references={references} />;
    plainEmitted += decoded;
    const bold = stack.includes("b") || stack.includes("strong");
    const italic = stack.includes("i") || stack.includes("em");
    const className = [
      bold ? "font-semibold text-primary" : "",
      italic ? "italic" : "",
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

  const source = html || "";
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

function SpellProse({ html, damageIcons = false, references = [] }: HtmlTextProps) {
  const matches = [...html.matchAll(SLOT_HEADING_RE)];
  if (matches.length === 0) return <InlineHtmlText html={html} damageIcons={damageIcons} references={references} />;

  const sections: ReactNode[] = [];
  let last = 0;
  const addProse = (part: string) => {
    const text = part.replace(/^(?:\s|<br\s*\/?>)+|(?:\s|<br\s*\/?>)+$/gi, "");
    if (text.replace(/<[^>]+>/g, "").trim()) {
      sections.push(<InlineHtmlText key={sections.length} html={text} damageIcons={damageIcons} references={references} />);
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

/** Preserve the source tables without allowing attributes or executable markup. */
export function HtmlText({ html, damageIcons = false, references = [] }: HtmlTextProps) {
  if (!html?.includes("<pre>")) return <SpellProse html={html || ""} damageIcons={damageIcons} references={references} />;
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
        return text ? <SpellProse key={index} html={text} damageIcons={damageIcons} references={references} /> : null;
      })}
    </div>
  );
}
