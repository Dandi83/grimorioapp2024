import type { ReactNode } from "react";

import { NoSrdTag } from "@/components/card-source-pill";
import { ReferenceText } from "@/components/html-text";
import { conditionLinks } from "@/lib/card-display";
import { inlineSpellReferences, markSpellNames, fileSpellCatalog, type SpellReferenceCatalog } from "@/lib/spell-references";
import { paragraphs, type SubclassDraft } from "@/lib/subclass-types";

/**
 * One subclass card for the SRD subclass of a class and for the ones added by the administrator, in the
 * «Sottoclasse» tab and in the preview of the editor: same order and layout. No class data here (safe in
 * the editor, in the browser): the SRD card passes its printed blocks, an added one its plain texts.
 */
interface SubclassCardFeature { livello: number; titolo: string; content: ReactNode }

export function SubclassCard({ name, from, motto, intro, features, tags, edit }: {
  name: string; from: number; motto?: string; intro: ReactNode; features: SubclassCardFeature[]; tags?: ReactNode; edit?: ReactNode;
}) {
  return (
    <article className="space-y-4 rounded-[14px] border-2 border-amber bg-card p-4" data-subclass-card="">
      <div>
        <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted">Sottoclasse · dal {from}º livello</p>
        <h2 className="mt-1 font-serif text-[26px] font-bold leading-tight text-primary">{name}{edit}</h2>
        {tags && <p className="mt-2 flex flex-wrap gap-1.5">{tags}</p>}
        {motto && <p className="mt-1 text-[16px] italic">{motto}</p>}
      </div>
      {intro}
      <ul className="flex flex-wrap gap-2" aria-label="Privilegi della sottoclasse">
        {features.map((feature, i) => (
          <li key={i} className="rounded-full border border-amber bg-[#FBEFCF] px-3 py-1 text-[13px] font-semibold">{feature.livello}{feature.titolo ? ` · ${feature.titolo}` : ""}</li>
        ))}
      </ul>
      <div className="space-y-5">
        {features.map((feature, i) => (
          <section key={i} className="space-y-2">
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted">Livello {feature.livello}</p>
            {feature.titolo && <h3 className="font-serif text-[20px] font-bold leading-tight text-primary">{feature.titolo}</h3>}
            {feature.content}
          </section>
        ))}
      </div>
    </article>
  );
}

export { NoSrdTag };

export interface AddedTextContext { catalog?: SpellReferenceCatalog; hidden?: readonly string[] }

/** The links of a plain text: conditions of its edition, spells named in it (lib/card-display.ts), damage icons. */
function referencesFor(texts: string[], legacy: boolean, context: AddedTextContext) {
  const catalog = context.catalog ?? fileSpellCatalog;
  const hidden = context.hidden ?? [];
  const spells = inlineSpellReferences(markSpellNames(texts.join("\n\n").replace(/&/g, "&amp;"), legacy, catalog), legacy, catalog)
    .filter(link => !hidden.some(path => link.href === path || link.href.startsWith(`${path}/`)));
  return [...conditionLinks(legacy, hidden), ...spells];
}

/** Plain paragraphs and «Nome. testo» entries, like the printed blocks of an SRD feature (ClassBlocks). */
function AddedBlocks({ text, entries = [], legacy, context }: { text: string; entries?: SubclassDraft["privilegi"][number]["voci"]; legacy: boolean; context: AddedTextContext }) {
  const parts = paragraphs(text);
  const references = referencesFor([...parts, ...entries.flatMap(entry => [entry.nome, entry.testo])], legacy, context);
  if (!parts.length && !entries.length) return null;
  return (
    <div className="space-y-3 text-[15px] leading-6 text-foreground">
      {parts.map((part, i) => <p key={i}><ReferenceText text={part} references={references} damageIcons /></p>)}
      {entries.map((entry, i) => (
        <p key={`v${i}`}>
          {entry.nome && <strong className="font-bold italic">{entry.nome.replace(/\.\s*$/, "")}. </strong>}
          {paragraphs(entry.testo).map((part, j) => <span key={j}>{j > 0 && <><br /><br /></>}<ReferenceText text={part} references={references} damageIcons /></span>)}
        </p>
      ))}
    </div>
  );
}

/** An added subclass as a card: its features in order, the empty ones (no name, text or entry) left out. */
export function AddedSubclassCard({ draft, from, context = {}, hiddenTag, edit }: { draft: SubclassDraft; from: number; context?: AddedTextContext; hiddenTag?: ReactNode; edit?: ReactNode }) {
  const legacy = draft.edizione === "2014";
  const features = draft.privilegi
    .filter(feature => feature.nome || feature.testo || feature.voci.length)
    .map(feature => ({ livello: feature.livello, titolo: feature.nome, content: <AddedBlocks text={feature.testo} entries={feature.voci} legacy={legacy} context={context} /> }));
  return (
    <SubclassCard name={draft.nome || "Nome della sottoclasse"} from={from} edit={edit}
      tags={<><NoSrdTag />{hiddenTag}</>}
      intro={<AddedBlocks text={draft.descrizione} legacy={legacy} context={context} />} features={features} />
  );
}
