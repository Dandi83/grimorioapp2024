import type { ClassBlock } from "@/lib/classes-types";

/** A paragraph as printed, its bold-italic run-in label in bold. */
function Labelled({ text, label }: { text: string; label?: string }) {
  if (!label || !text.startsWith(label)) return <>{text}</>;
  return <><strong className="font-bold italic">{label}</strong>{text.slice(label.length)}</>;
}

/** «• Ottiene … • Ottiene …»: the bullets of the manual as a list, the text before them as a paragraph. */
function Paragraph({ text, label }: { text: string; label?: string }) {
  const [lead, ...items] = text.split(/\s*•\s+/);
  return (
    <>
      {lead && <p><Labelled text={lead} label={label} /></p>}
      {items.length > 0 && (
        <ul className="list-disc space-y-1 pl-5">
          {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      )}
    </>
  );
}

export function ClassInnerTable({ title, columns, rows }: { title: string; columns: string[]; rows: string[][] }) {
  return (
    <div className="min-w-0 max-w-full overflow-x-auto rounded-[12px] border border-border bg-card" role="region" tabIndex={0} aria-label={`Tabella ${title}, scorribile orizzontalmente`}>
      <table className="w-full min-w-max text-[14px] leading-5">
        <caption className="px-3 pt-2.5 text-left font-serif text-[17px] font-bold text-primary">{title}</caption>
        <thead>
          <tr className="border-b border-divider text-left text-[12px] font-bold uppercase tracking-[0.04em] text-muted">
            {columns.map((column, i) => <th key={i} scope="col" className="px-3 py-2 align-bottom">{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="border-t border-divider align-top">
              {row.map((cell, c) => <td key={c} className={`px-3 py-2 ${c === 0 ? "font-bold tabular-nums" : ""}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Paragraphs, tables and boxed sidebars of a feature, as printed. Server only: no text reaches the browser code. */
export function ClassBlocks({ blocks }: { blocks: ClassBlock[] }) {
  return (
    <div className="space-y-3 text-[15px] leading-6 text-foreground">
      {blocks.map((block, i) => block.tipo === "p" ? (
        <Paragraph key={i} text={block.testo} label={block.etichetta} />
      ) : block.tipo === "tabella" ? (
        <ClassInnerTable key={i} title={block.titolo} columns={block.colonne} rows={block.righe} />
      ) : (
        <aside key={i} className="space-y-2 rounded-[12px] border border-border bg-[#F3EAD6] p-3.5">
          <h4 className="font-serif text-[18px] font-bold text-primary">{block.titolo}</h4>
          {block.paragrafi.map((paragraph, j) => <p key={j}><Labelled text={paragraph.testo} label={paragraph.etichetta} /></p>)}
        </aside>
      ))}
    </div>
  );
}
