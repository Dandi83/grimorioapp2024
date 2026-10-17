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

function InlineHtmlText({ html }: { html: string }) {
  const nodes: ReactNode[] = [];
  const stack: string[] = [];
  let key = 0;
  let last = 0;

  const emit = (text: string) => {
    const decoded = decodeEntities(text);
    if (!decoded) return;
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
          {decoded}
        </span>
      ) : (
        <Fragment key={key++}>{decoded}</Fragment>
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
      if (tag === "br") nodes.push(<br key={key++} />);
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

function SpellProse({ html }: { html: string }) {
  const matches = [...html.matchAll(SLOT_HEADING_RE)];
  if (matches.length === 0) return <InlineHtmlText html={html} />;

  const sections: ReactNode[] = [];
  let last = 0;
  const addProse = (part: string) => {
    const text = part.replace(/^(?:\s|<br\s*\/?>)+|(?:\s|<br\s*\/?>)+$/gi, "");
    if (text.replace(/<[^>]+>/g, "").trim()) {
      sections.push(<InlineHtmlText key={sections.length} html={text} />);
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
export function HtmlText({ html }: { html: string }) {
  if (!html?.includes("<pre>")) return <SpellProse html={html || ""} />;
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
              {decodeEntities(part.slice(5, -6))}
            </pre>
          );
        }
        const text = part.replace(/^(?:<br>)+|(?:<br>)+$/g, "");
        return text ? <SpellProse key={index} html={text} /> : null;
      })}
    </div>
  );
}
