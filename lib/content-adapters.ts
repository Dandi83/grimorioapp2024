/**
 * How each kind of card exposes its printed values as editable fields, and how corrected values
 * are written back onto a copy of the card. Pure: the registry (lib/content-sections.ts), the
 * public pages (lib/corrected-content.ts) and the tests share it. The original object is never changed.
 */
import type { ArmorEditionView } from "./armor";
import type { GearItem } from "./adventuring-gear";
import type { Gear2014Item } from "./adventuring-gear-2014";
import type { Tool2024 } from "./tools";
import type { Tool2014 } from "./tools-2014";
import type { MagicItem } from "./magic-items";
import type { ManualEntry } from "./manual-types";

export type Fields = Record<string, string>;

export interface CardAdapter<T> {
  read(card: T): Fields;
  write(card: T, values: Fields): T;
  /** Label of a dynamic field (paragraphs, blocks): «Paragrafo 2», «Titoletto 1». */
  label?(card: T, field: string): string | undefined;
}

const paragraphs = (list: string[]): Fields => Object.fromEntries(list.map((text, i) => [`paragrafo-${i + 1}`, text]));
const writeParagraphs = (list: string[], values: Fields) => list.map((text, i) => values[`paragrafo-${i + 1}`] ?? text);
const paragraphLabel = (field: string) => /^paragrafo-(\d+)$/.exec(field)?.[1] && `Paragrafo ${/^paragrafo-(\d+)$/.exec(field)![1]}`;
const optional = (key: string, value: string | undefined): Fields => (value === undefined ? {} : { [key]: value });

export const armorAdapter: CardAdapter<ArmorEditionView> = {
  read: card => ({ nome: card.nome, caTesto: card.caTesto, costo: card.costo, peso: card.peso, forza: card.forza ?? "" }),
  write: (card, v) => {
    const { forza: _old, ...rest } = card;
    void _old;
    return { ...rest, nome: v.nome ?? card.nome, caTesto: v.caTesto ?? card.caTesto, costo: v.costo ?? card.costo, peso: v.peso ?? card.peso, ...((v.forza ?? card.forza) ? { forza: v.forza ?? card.forza } : {}) };
  },
};

export const gear2024Adapter: CardAdapter<GearItem> = {
  read: card => ({ nome: card.nome, prezzo: card.prezzo, ...optional("peso", card.peso), ...paragraphs(card.paragraphs) }),
  write: (card, v) => ({ ...card, nome: v.nome ?? card.nome, prezzo: v.prezzo ?? card.prezzo, ...(card.peso !== undefined ? { peso: v.peso ?? card.peso } : {}), paragraphs: writeParagraphs(card.paragraphs, v) }),
  label: (_card, field) => paragraphLabel(field),
};

export const gear2014Adapter: CardAdapter<Gear2014Item> = {
  read: card => ({ nome: card.nome, ...optional("costo", card.costo), ...optional("peso", card.peso), ...paragraphs(card.paragraphs) }),
  write: (card, v) => ({
    ...card, nome: v.nome ?? card.nome,
    ...(card.costo !== undefined ? { costo: v.costo ?? card.costo } : {}), ...(card.peso !== undefined ? { peso: v.peso ?? card.peso } : {}),
    paragraphs: writeParagraphs(card.paragraphs, v),
  }),
  label: (_card, field) => paragraphLabel(field),
};

export const tool2024Adapter: CardAdapter<Tool2024> = {
  read: card => ({ nome: card.nome, prezzo: card.prezzo, caratteristica: card.caratteristica, peso: card.peso, utilizzo: card.utilizzo, creazione: card.creazione.join("\n") }),
  write: (card, v) => ({
    ...card, nome: v.nome ?? card.nome, prezzo: v.prezzo ?? card.prezzo, caratteristica: v.caratteristica ?? card.caratteristica, peso: v.peso ?? card.peso,
    utilizzo: v.utilizzo ?? card.utilizzo, creazione: v.creazione === undefined ? card.creazione : v.creazione.split("\n").map(line => line.trim()).filter(Boolean),
  }),
};

export const tool2014Adapter: CardAdapter<Tool2014> = {
  read: card => ({ nome: card.nome, costo: card.costo, peso: card.peso, ...paragraphs(card.paragraphs) }),
  write: (card, v) => ({ ...card, nome: v.nome ?? card.nome, costo: v.costo ?? card.costo, peso: v.peso ?? card.peso, paragraphs: writeParagraphs(card.paragraphs, v) }),
  label: (_card, field) => paragraphLabel(field),
};

const blockIndex = (field: string) => { const n = /^blocco-(\d+)$/.exec(field)?.[1]; return n ? Number(n) - 1 : -1; };

/** Magic items: name, the type line and every paragraph or list item; tables and stat blocks are not editable. */
export const magicItemAdapter: CardAdapter<MagicItem> = {
  read: card => ({
    nome: card.nome, rigaTipo: card.rigaTipo,
    ...Object.fromEntries(card.blocchi.flatMap((block, i) => (block.kind === "p" || block.kind === "li" ? [[`blocco-${i + 1}`, block.text]] : []))),
  }),
  write: (card, v) => ({
    ...card, nome: v.nome ?? card.nome, rigaTipo: v.rigaTipo ?? card.rigaTipo,
    blocchi: card.blocchi.map((block, i) => ((block.kind === "p" || block.kind === "li") && v[`blocco-${i + 1}`] !== undefined ? { ...block, text: v[`blocco-${i + 1}`] } : block)),
  }),
  label: (card, field) => {
    const block = card.blocchi[blockIndex(field)];
    if (!block) return undefined;
    const kind = block.kind === "li" ? "Voce di elenco" : "Paragrafo";
    const n = card.blocchi.slice(0, blockIndex(field) + 1).filter(other => other.kind === block.kind).length;
    return `${kind} ${n}${"label" in block && block.label ? ` («${block.label}»)` : ""}`;
  },
};

/** Conditions and Manual entries: the title, headings and paragraphs; tables are not editable. */
export const manualAdapter: CardAdapter<ManualEntry> = {
  read: card => ({
    title: card.title,
    ...Object.fromEntries(card.blocks.flatMap((block, i) => (block.kind === "prose" || block.kind === "heading" ? [[`blocco-${i + 1}`, block.text]] : []))),
  }),
  write: (card, v) => ({
    ...card, title: v.title ?? card.title,
    blocks: card.blocks.map((block, i) => (v[`blocco-${i + 1}`] !== undefined && (block.kind === "prose" || block.kind === "heading") ? { ...block, text: v[`blocco-${i + 1}`] } : block)),
  }),
  label: (card, field) => {
    const block = card.blocks[blockIndex(field)];
    if (!block) return undefined;
    const n = card.blocks.slice(0, blockIndex(field) + 1).filter(other => other.kind === block.kind).length;
    return `${block.kind === "heading" ? "Titoletto" : "Paragrafo"} ${n}`;
  },
};
