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

export function HtmlText({ html }: { html: string }) {
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
