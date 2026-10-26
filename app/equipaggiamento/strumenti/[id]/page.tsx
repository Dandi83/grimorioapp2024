import Link from "next/link";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { ToolEditionPanels } from "@/components/equipment/tool-edition-panels";
import { PartBlock } from "@/components/sections/part-block";
import { pageEditions, sectionPage, CLOSED_METADATA, sectionClosed } from "@/lib/section-view";
import { tools2014Source, type Tool2014 } from "@/lib/tools-2014";
import { toolsSection, type Tool2024 } from "@/lib/tools";
import { compareTool, getToolEntry, toolEntries, toolHref, toolKey } from "@/lib/tools-editions";
import { SectionCorrectionNote } from "@/components/correction-note";
import { getCorrectedTools } from "@/lib/corrected-content";
import type { EquipmentEdition } from "@/lib/equipment-types";
import { ReportLink } from "@/components/feedback/report-link";

export const dynamicParams = false;
// Manual corrections from the admin area appear within five minutes (at once after saving).
export const revalidate = 300;

const SRD_521 = "https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf";
const LIST = "/equipaggiamento/strumenti";
const GROUP_NAMES: Record<string, string> = { artigiano: "Strumento da artigiano", giochi: "Gioco", musicali: "Strumento musicale", altri: "Strumento" };
const GROUP_TITLES: Record<string, string> = { artigiano: "Strumenti da artigiano", giochi: "Giochi", musicali: "Strumenti musicali" };
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function generateStaticParams() {
  return toolEntries.map(({ id }) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  // Hidden or «In arrivo»: no name or description of the card in the answer.
  if (await sectionClosed("strumenti")) return CLOSED_METADATA;
  const entry = getToolEntry((await params).id, (await getCorrectedTools()).list);
  const tool = entry && (entry.editions["2024"] ?? entry.editions["2014"]);
  return { title: tool ? `${tool.nome} — Strumenti — Il Grimorio.App` : "Strumento non trovato" };
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-divider px-2 py-3 text-center last:border-r-0">
      <p className="text-[12px] font-bold tracking-[0.06em] text-muted">{label}</p>
      <p className="font-serif text-xl font-bold leading-tight">{value}</p>
    </div>
  );
}

function Heading({ nome, kind, edition }: { nome: string; kind: string; edition: EquipmentEdition }) {
  return (
    <div className="text-center">
      <h1 className="font-serif text-4xl font-bold leading-tight">{nome}</h1>
      <p className="mt-1 text-[15px] text-muted">{kind} · edizione {edition}</p>
    </div>
  );
}

function Source({ document, url, page }: { document: string; url: string; page: number }) {
  return (
    <aside aria-label="Fonte" data-source-box="" className="rounded-xl border border-border bg-card p-4 text-sm leading-6 text-muted">
      <p>Testo integrale: {document} italiano — «Strumenti».</p>
      <a className="underline underline-offset-4" href={`${url}#page=${page}`} target="_blank" rel="noreferrer">Fonte ufficiale, pagina {page}</a>
      {" · "}<Link className="underline underline-offset-4" href="/fonti">Attribuzione e licenza</Link>
    </aside>
  );
}

function Sheet2024({ tool }: { tool: Tool2024 }) {
  const variantLinks = new Map(toolEntries.filter(entry => entry.variante?.tool === tool).map(entry => [toolKey(entry.variante!.variant.nome), entry.id]));
  return (
    <div className="space-y-5 pt-4">
      <Heading nome={tool.nome} kind={tool.gruppo === "artigiano" ? "Strumento da artigiano" : "Strumento"} edition="2024" />
      <div className="grid grid-cols-2 rounded-[14px] border border-border bg-card">
        <Cell label="COSTO" value={tool.prezzo} />
        <Cell label="PESO" value={tool.peso || "non verificato"} />
      </div>
      <p className="flex flex-wrap items-center gap-2 text-[15px]">
        <span className="text-muted">Caratteristica</span>
        <span className="rounded-full border border-chip-border bg-primary-faint px-3 py-0.5 font-bold text-primary">{tool.caratteristica}</span>
      </p>
      <section aria-labelledby="utilizzo" className="space-y-1.5 rounded-[14px] border border-border bg-card p-3.5">
        <h2 id="utilizzo" className="font-serif text-[20px] font-bold text-primary">Utilizzo</h2>
        <p className="text-[15px] leading-6">{capitalize(tool.utilizzo)}</p>
      </section>
      {tool.creazione.length > 0 && (
        <section aria-labelledby="creazione" className="space-y-1.5 rounded-[14px] border border-border bg-card p-3.5">
          <h2 id="creazione" className="font-serif text-[20px] font-bold text-primary">Creazione</h2>
          <ul className="list-disc space-y-0.5 pl-5 text-[15px] leading-6">
            {tool.creazione.map(item => <li key={item}>{capitalize(item)}</li>)}
          </ul>
        </section>
      )}
      {tool.varianti.length > 0 && (
        <section aria-labelledby="varianti" className="space-y-1.5">
          <h2 id="varianti" className="font-serif text-[20px] font-bold text-primary">Varianti</h2>
          <ul className="overflow-hidden rounded-[14px] border border-border bg-card">
            {tool.varianti.map(variant => {
              const id2014 = variantLinks.get(toolKey(variant.nome));
              return (
                <li key={variant.nome} className="flex min-h-12 items-center gap-3 border-b border-divider px-3.5 py-2 last:border-b-0">
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif text-[19px] font-bold leading-tight">{capitalize(variant.nome)}</span>
                    {variant.peso && <span className="block text-[14px] text-muted">{variant.peso}</span>}
                    {id2014 && <Link href={toolHref(id2014)} className="text-[14px] text-primary underline underline-offset-4">Voce 2014</Link>}
                  </span>
                  <span className="shrink-0 text-[15px] font-semibold">{variant.costo}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <details className="rounded-[14px] border border-border bg-card px-4 py-1">
        <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-primary">Competenza negli strumenti</summary>
        <div className="space-y-2 pb-3">{toolsSection("Competenza negli strumenti").map((text, i) => <p key={i} className="text-[15px] leading-6">{text}</p>)}</div>
      </details>
      <Source document="SRD 5.2.1" url={SRD_521} page={tool.page} />
    </div>
  );
}

function Sheet2014({ tool }: { tool: Tool2014 }) {
  return (
    <div className="space-y-5 pt-4">
      <Heading nome={tool.nome} kind={GROUP_NAMES[tool.gruppo]} edition="2014" />
      <div className="grid grid-cols-2 rounded-[14px] border border-border bg-card">
        <Cell label="COSTO" value={tool.costo} />
        <Cell label="PESO" value={tool.peso} />
      </div>
      {tool.paragraphs.map((text, i) => <p key={i} className="font-serif text-[1.05rem] leading-7">{text}</p>)}
      {tool.paragraphs.length === 0 && tool.gruppo !== "altri" && (
        <p className="text-[15px] text-muted">Le regole valgono per tutto il gruppo «{GROUP_TITLES[tool.gruppo]}»: <Link className="text-primary underline underline-offset-4" href={LIST}>le trovi nell’elenco</Link>.</p>
      )}
      <Source document="SRD 5.1" url={tools2014Source.sourceUrl} page={tool.page} />
    </div>
  );
}

export default async function ToolPage({ params }: { params: Promise<{ id: string }> }) {
  // Before anything of the page: the gate of the layout runs in parallel and cannot stop what the page streams.
  await sectionPage("strumenti");
  const corrected = await getCorrectedTools();
  const entry = getToolEntry((await params).id, corrected.list);
  if (!entry) notFound();
  // An edition hidden from /admin/sezioni is not in the page; a tool printed only there is not found.
  const shown = await pageEditions("strumenti");
  const has = (value: EquipmentEdition) => Boolean(entry.editions[value]) && shown.includes(value);
  if (!has("2024") && !has("2014")) notFound();
  const corrections = corrected.corrections.get(entry.id);
  const note = (value: EquipmentEdition) => <div className="mt-5"><SectionCorrectionNote section="strumenti" id={entry.id} edition={value} corrections={corrections?.[value]} /></div>;
  const rows = shown.length === 2 ? compareTool(entry) : [];
  const panels: Partial<Record<EquipmentEdition, React.ReactNode>> = {};
  if (has("2024")) panels["2024"] = <><Sheet2024 tool={entry.editions["2024"]!} />{note("2024")}</>;
  if (has("2014")) panels["2014"] = <><Sheet2014 tool={entry.editions["2014"]!} />{note("2014")}</>;
  const current = toolHref(entry.id);
  const variant = entry.variante;
  return (
    <article className="space-y-5 px-4 pb-8 pt-4 sm:px-6">
      <BackButton fallback={LIST} label="Tutti gli strumenti" />
      <div>
        <ToolEditionPanels section="strumenti" panels={panels} current={current} listHref={LIST}
          hrefs={{ "2014": current, "2024": variant ? toolHref(variant.tool.id) : current }}
          note={variant ? <>Nel 2024: <Link className="text-primary underline underline-offset-4" href={toolHref(variant.tool.id)}>{variant.tool.nome}</Link>, variante «{capitalize(variant.variant.nome)}»</> : undefined} />
      </div>
      {rows.length > 0 && (
        <PartBlock section="strumenti" part="confronto">
        <section className="space-y-2.5" aria-label="Differenze tra le edizioni">
          <h2 className="font-serif text-[22px] font-bold text-primary">2014 → 2024</h2>
          <table className="w-full table-fixed overflow-hidden rounded-[14px] border border-border bg-card text-[14px]">
            <thead className="bg-elevated text-left text-[12px] font-bold tracking-[0.06em] text-muted">
              <tr><th className="w-[24%] px-2.5 py-2"><span className="sr-only">Voce</span></th><th className="px-2 py-2">2014</th><th className="px-2 py-2">2024</th></tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.label} className="border-t border-divider align-top">
                  <th scope="row" className="px-2.5 py-2.5 text-left font-normal text-muted">{row.label}</th>
                  <td className="break-words px-2 py-2.5">{row.before}</td>
                  <td className="break-words px-2 py-2.5 font-bold text-primary">{row.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        </PartBlock>
      )}
      <ReportLink />
    </article>
  );
}
