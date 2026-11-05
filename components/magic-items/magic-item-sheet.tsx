import Link from "next/link";

import { MagicItemText } from "@/components/magic-items/magic-item-text";
import { damageRuleLinks } from "@/lib/damage-rule-link";
import { RarityChip } from "@/components/magic-items/rarity-chip";
import { Divisore, Etichetta } from "@/components/pergamena/pergamena";
import { MAGIC_ITEM_SOURCES, attunementText, magicItemsRulesHref, type MagicItem } from "@/lib/magic-items";
import { rarityCategories, type MagicItemEdition } from "@/lib/magic-items-types";

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** The rarity of the chip for the label above the name: «Raro», «Non comune – Molto raro», «Rarità variabile». */
function rarityLabel(printed: string): string | undefined {
  const categories = rarityCategories(printed);
  if (!categories.length) return undefined;
  const name = (category: string) => (category === "Variabile" ? "Rarità variabile" : category);
  const first = categories[0], last = categories[categories.length - 1];
  return first === last ? name(first) : `${name(first)} – ${name(last)}`;
}

/** Type, rarity and attunement read from the printed type line, as chips. */
function Chips({ item }: { item: MagicItem }) {
  const attunement = attunementText(item);
  return (
    <ul className="pg-angoli mx-auto flex w-fit max-w-full flex-wrap justify-center gap-2 rounded-xl border border-border bg-card/60 px-6 py-3" aria-label="Tipo, rarità e sintonia">
      <li className="inline-flex min-h-7 items-center rounded-[6px] border border-border bg-card px-2 text-[13px] font-bold">
        {item.tipo}{item.dettaglioTipo ? ` (${item.dettaglioTipo})` : ""}
      </li>
      <li><RarityChip printed={item.rarita} categories={rarityCategories(item.rarita)} full /></li>
      {attunement && <li className="inline-flex min-h-7 items-center rounded-[6px] border border-chip-border bg-chip px-2 text-[13px] font-bold text-primary">{capital(attunement)}</li>}
    </ul>
  );
}

/** Sheet of a magic item: name, chips from the type line, full printed text and source. */
/** hidden: what the links of the text may not lead to (linksOut). */
/** heading: one H1 per page (PROMPT 45): the second edition panel has the same title as an H2, same look. */
export function MagicItemSheet({ item, edition, hidden = [], heading: Heading = "h1" }: { item: MagicItem; edition: MagicItemEdition; hidden?: readonly string[]; heading?: "h1" | "h2" }) {
  const source = MAGIC_ITEM_SOURCES[edition];
  const rules = magicItemsRulesHref();
  const pages = item.pagine.length > 1 ? `pagine ${item.pagine[0]}–${item.pagine[item.pagine.length - 1]}` : `pagina ${item.pagina}`;
  return (
    <div className="space-y-5 pt-4">
      <div className="space-y-3 text-center">
        {/* PROMPT 65: «OGGETTO MAGICO · RARO» (the rarity of the chip), capilettera and divider; the chips in the copper frame. */}
        <div className="flex flex-col items-center gap-1">
          <Etichetta parti={["Oggetto magico", rarityLabel(item.rarita)]} />
          <Heading className="pg-capolettera font-serif text-4xl font-bold leading-tight">{item.nome}</Heading>
          <Divisore className="mt-1" />
        </div>
        <Chips item={item} />
      </div>
      <MagicItemText blocks={item.blocchi} rules={damageRuleLinks(edition === "2014", hidden)} />
      <aside aria-label="Fonte" data-source-box="" className="rounded-xl border border-border bg-card p-4 text-sm leading-6 text-muted">
        <p>Testo integrale: {source.srd} italiano — «Oggetti magici A–Z».</p>
        <a className="underline underline-offset-4" href={`${source.url}#page=${item.pagina}`} target="_blank" rel="noreferrer">Fonte ufficiale, {pages}</a>
        {" · "}<Link className="underline underline-offset-4" href="/fonti">Attribuzione e licenza</Link>
        {rules && <>{" · "}<Link className="underline underline-offset-4" href={rules}>Regole sugli oggetti magici</Link></>}
      </aside>
    </div>
  );
}
