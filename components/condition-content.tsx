import { ReferenceText } from "@/components/html-text";
import { inlineConditionReferences } from "@/lib/conditions";
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
