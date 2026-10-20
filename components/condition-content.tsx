import { ReferenceText } from "@/components/html-text";
import { inlineConditionReferences, legacyInlineConditionReferences } from "@/lib/conditions";
import type { ManualEntry } from "@/lib/manual-types";

/** Present the original condition paragraphs as scan-friendly effect sections. */
export function ConditionContent({ entry }: { entry: ManualEntry }) {
  const [introduction, ...blocks] = entry.blocks;
  const effects: { title: string; body: string }[] = [];
  for (const block of blocks) {
    const match = /^(\p{Lu}[^.]*\.)\s+([\s\S]+)$/u.exec(block.text);
    if (match) {
      effects.push({ title: match[1], body: match[2] });
    } else if (effects.length) {
      // A PDF column break can split an effect into two source paragraphs.
      effects[effects.length - 1].body += ` ${block.text}`;
    } else {
      effects.push({ title: "", body: block.text });
    }
  }
  const references = inlineConditionReferences.filter(reference => reference.href !== `/manuale/${entry.id}`);
  return (
    <div className="condition-sheet min-w-0">
      {introduction && <p className="mb-6 font-serif text-[17px] leading-relaxed text-card-foreground">{introduction.text}</p>}
      <div className="space-y-6">
        {effects.map((effect, index) => (
          <section key={index} data-condition-effect>
            {effect.title && <h2 className="mb-3 border-b border-primary/40 pb-2 font-serif text-xl font-semibold leading-7 text-primary">{effect.title}</h2>}
            {" "}
            <p className="font-serif text-[17px] leading-relaxed text-card-foreground">
              <ReferenceText text={effect.body} references={references} />
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}

/** 2014 conditions (SRD 5.1): the printed bullets, the Indebolimento table and links to other 2014 conditions only. */
export function LegacyConditionContent({ entry }: { entry: ManualEntry }) {
  const references = legacyInlineConditionReferences.filter(reference => reference.href !== `/manuale/${entry.id}`);
  const bullets = entry.blocks.filter(block => block.text.startsWith("•"));
  return (
    <div className="condition-sheet min-w-0 space-y-5">
      <p className="text-xs leading-5 text-muted">Definizione delle regole 2014 (SRD 5.1). Le regole 2024 di questa condizione sono diverse.</p>
      {bullets.length === entry.blocks.length ? (
        <ul className="list-disc space-y-3 pl-5 marker:text-primary">
          {bullets.map((block, index) => (
            <li key={index} className="font-serif text-[17px] leading-relaxed text-card-foreground">
              <ReferenceText text={block.text.replace(/^•\s*/, "")} references={references} />
            </li>
          ))}
        </ul>
      ) : entry.blocks.map((block, index) => block.kind === "table" ? (
        <div key={index} className="min-w-0 max-w-full overflow-x-auto rounded-xl border border-border bg-card" tabIndex={0} role="region" aria-label={`Tabella di ${entry.title}, scorribile orizzontalmente`}>
          <pre className="w-max min-w-full p-4 font-mono text-xs leading-5 text-card-foreground">{block.text}</pre>
        </div>
      ) : (
        <p key={index} className="font-serif text-[17px] leading-relaxed text-card-foreground">
          <ReferenceText text={block.text} references={references} />
        </p>
      ))}
    </div>
  );
}
