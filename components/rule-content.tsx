import Link from "next/link";

import { ReferenceText } from "@/components/html-text";
import type { RuleEntry } from "@/lib/concentration";
import { inlineConditionReferences, legacyInlineConditionReferences } from "@/lib/conditions";

/** A rule of the SRD as printed: paragraphs, bold labels, the 2014 bullets; condition links of its edition. */
export function RuleContent({ rule }: { rule: RuleEntry }) {
  const references = rule.edizione === "2014" ? legacyInlineConditionReferences : inlineConditionReferences;
  const paragraph = (text: string, label?: string) => {
    const body = label && text.startsWith(label) ? text.slice(label.length) : text;
    return <>{label && body !== text && <strong className="font-semibold italic text-foreground">{label}</strong>}<ReferenceText text={body} references={references} /></>;
  };
  const items: React.ReactNode[] = [];
  for (let index = 0; index < rule.blocks.length; index++) {
    const block = rule.blocks[index];
    if (block.text.startsWith("•")) {
      const bullets = [];
      while (index < rule.blocks.length && rule.blocks[index].text.startsWith("•")) bullets.push(rule.blocks[index++]);
      index--;
      items.push(
        <ul key={index} className="list-disc space-y-3 pl-5 marker:text-primary">
          {bullets.map((bullet, i) => <li key={i} className="font-serif text-[17px] leading-relaxed text-card-foreground">{paragraph(bullet.text.replace(/^•\s*/, ""), bullet.label)}</li>)}
        </ul>,
      );
    } else {
      items.push(<p key={index} className="font-serif text-[17px] leading-relaxed text-card-foreground">{paragraph(block.text, block.label)}</p>);
    }
  }
  return (
    <div className="condition-sheet min-w-0 space-y-5">
      {items}
      <aside aria-label="Fonte della regola" className="rounded-xl border border-border bg-card p-4 text-sm leading-6 text-muted">
        <p>Testo integrale: {rule.document}, {rule.chapter} — {rule.title}.</p>
        <a className="underline underline-offset-4" href={`${rule.sourceUrl}#page=${rule.page}`} target="_blank" rel="noreferrer">Fonte ufficiale, {rule.pages.length === 1 ? "pagina" : "pagine"} {rule.pages.join(", ")}</a>
        {" · "}<Link className="underline underline-offset-4" href="/fonti">Attribuzione e licenza</Link>
      </aside>
    </div>
  );
}
