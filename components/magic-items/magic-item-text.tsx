import { Fragment, type ReactNode } from "react";

import { ReferenceText } from "@/components/html-text";
import { findRuleTerms, type RuleTermLinks } from "@/lib/damage-rule-link";
import type { MagicItemBlock } from "@/lib/magic-items";

/** The runs of a text between its style marks: **bold**, *italic*, \* for an asterisk printed as such. */
function styledRuns(text: string) {
  const runs: { text: string; bold: boolean; italic: boolean; start: number }[] = [];
  let buffer = "", bold = false, italic = false, plain = 0;
  const flush = () => {
    if (buffer) runs.push({ text: buffer, bold, italic, start: plain });
    plain += buffer.length;
    buffer = "";
  };
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\\" && text[i + 1] === "*") { buffer += "*"; i++; continue; }
    if (text.startsWith("**", i)) { flush(); bold = !bold; i++; continue; }
    if (text[i] === "*") { flush(); italic = !italic; continue; }
    buffer += text[i];
  }
  flush();
  return runs;
}

/**
 * Printed styles of a text. rules: «resistenza», «immunità», «vulnerabilità» linked to the rules of the edition
 * (lib/damage-rule-link.ts), one per term, never in an italic run (the spell names).
 */
function RichText({ text, rules }: { text: string; rules?: RuleTermLinks }) {
  const runs = styledRuns(text);
  const spots = findRuleTerms(runs.map(run => run.text).join(""), rules,
    (start, end) => !runs.some(run => !run.italic && run.start <= start && end <= run.start + run.text.length));
  return <>{runs.map((run, key) => {
    const ruleLinks = spots.filter(spot => spot.start >= run.start && spot.end <= run.start + run.text.length)
      .map(spot => ({ start: spot.start - run.start, end: spot.end - run.start, href: spot.href }));
    const content = ruleLinks.length ? <ReferenceText text={run.text} ruleLinks={ruleLinks} /> : run.text;
    return run.bold ? <strong key={key}>{run.italic ? <em>{content}</em> : content}</strong> : run.italic ? <em key={key}>{content}</em> : <Fragment key={key}>{content}</Fragment>;
  })}</>;
}

/** A table with long texts in more than two columns becomes one card per row on the phone. */
const asCards = (block: Extract<MagicItemBlock, { kind: "table" }>) =>
  block.header.length > 2 && block.rows.some(row => row.slice(1).some(cell => cell.length > 60));

function Table({ block }: { block: Extract<MagicItemBlock, { kind: "table" }> }) {
  const caption = block.title ? <h3 className="font-serif text-[20px] font-bold leading-tight text-primary">{block.title}</h3> : null;
  const notes = block.notes?.map((note, i) => <p key={i} className="text-[14px] leading-5 text-muted"><RichText text={note} /></p>);
  if (asCards(block)) {
    return (
      <section className="space-y-2" aria-label={block.title || "Tabella"} data-table-rows={block.rows.length}>
        {caption}
        <ul className="overflow-hidden rounded-[14px] border border-border bg-card">
          {block.rows.map((row, r) => (
            <li key={r} className="border-b border-divider px-3.5 py-2.5 last:border-b-0">
              <p className="font-serif text-[18px] font-bold leading-tight">{block.header[0]} <RichText text={row[0]} /></p>
              <dl className="mt-1 space-y-1 text-[15px] leading-6">
                {block.header.slice(1).map((column, c) => (
                  <div key={column}><dt className="inline font-semibold text-muted">{column}: </dt><dd className="inline"><RichText text={row[c + 1]} /></dd></div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
        {notes}
      </section>
    );
  }
  return (
    <section className="space-y-2" aria-label={block.title || "Tabella"} data-table-rows={block.rows.length}>
      {caption}
      <table className="w-full overflow-hidden rounded-[14px] border border-border bg-card text-[15px] leading-6">
        <thead className="bg-elevated text-left text-[13px] font-bold text-muted">
          <tr>{block.header.map(column => <th key={column} scope="col" className="px-2.5 py-2 align-bottom">{column}</th>)}</tr>
        </thead>
        <tbody>
          {block.rows.map((row, r) => (
            <tr key={r} className="border-t border-divider align-top">
              {row.map((cell, c) => (
                <td key={c} className={`break-words px-2.5 py-2 [overflow-wrap:anywhere] ${c === 0 ? "whitespace-nowrap font-semibold tabular-nums" : ""}`}>
                  <RichText text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {notes}
    </section>
  );
}

function StatBlock({ block, rules }: { block: Extract<MagicItemBlock, { kind: "statblock" }>; rules?: RuleTermLinks }) {
  return (
    <section className="rounded-[14px] border-2 border-primary/40 bg-card px-4 py-3 text-[15px] leading-6" aria-label="Scheda delle statistiche">
      {block.lines.map((line, i) => (
        <p key={i} className={i === 0 ? "font-serif text-[22px] leading-tight text-primary" : ""}><RichText text={line} rules={i === 0 ? undefined : rules} /></p>
      ))}
    </section>
  );
}

/** The full printed text of a magic item: paragraphs, run-in labels, bullet lists, tables and stat blocks. */
type Prose = Extract<MagicItemBlock, { text: string }>;

export function MagicItemText({ blocks, rules }: { blocks: MagicItemBlock[]; rules?: RuleTermLinks }) {
  const out: ReactNode[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.kind === "li") {
      const items: string[] = [];
      while (i < blocks.length && blocks[i].kind === "li") {
        const item = blocks[i] as Prose;
        items.push(item.label ? `**${item.label}** ${item.text}` : item.text);
        i++;
      }
      i--;
      out.push(
        <ul key={out.length} className="list-disc space-y-1 pl-6 font-serif text-[1.05rem] leading-7 marker:text-primary">
          {items.map((text, n) => <li key={n}><RichText text={text} rules={rules} /></li>)}
        </ul>,
      );
    } else if (block.kind === "p") {
      out.push(
        <p key={out.length} className="font-serif text-[1.05rem] leading-7">
          {block.label && <strong className="italic">{block.label} </strong>}
          <RichText text={block.text} rules={rules} />
        </p>,
      );
    } else if (block.kind === "table") {
      out.push(<Table key={out.length} block={block} />);
    } else if (block.kind === "statblock") {
      out.push(<StatBlock key={out.length} block={block} rules={rules} />);
    }
  }
  return <div className="space-y-3">{out}</div>;
}
