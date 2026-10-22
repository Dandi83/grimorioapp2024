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
import type { ClassBlock, ClassData, ClassFeature, ClassParagraph } from "./classes-types";

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

/**
 * Classes: the name, the values of «Tratti del …», every paragraph and feature title of the class
 * and of its subclass. Tables, sidebars and the spell list are not editable (rows and columns).
 * The walk gives each field a stable key from its place in the card («privilegio-3-2»: feature 3,
 * block 2), the same for reading and for writing back.
 */
type ClassField = { key: string; label: string; get(card: ClassData): string; set(card: ClassData, value: string): void };

function classFields(card: ClassData): ClassField[] {
  const fields: ClassField[] = [{ key: "nome", label: "Nome", get: c => c.nome, set: (c, v) => { c.nome = v; } }];
  card.tratti.voci.forEach((voce, i) => fields.push({
    key: `tratto-${i + 1}`, label: `Tratti · ${voce.etichetta}`, get: c => c.tratti.voci[i].valore, set: (c, v) => { c.tratti.voci[i].valore = v; },
  }));
  const paragraphsOf = (prefix: string, label: string, list: (c: ClassData) => ClassBlock[] | undefined) => (list(card) ?? []).forEach((block, j) => {
    if (block.tipo !== "p") return;
    const n = (list(card) ?? []).slice(0, j + 1).filter(other => other.tipo === "p").length;
    fields.push({
      key: `${prefix}-${j + 1}`, label: `${label} · paragrafo ${n}`,
      get: c => (list(c)![j] as ClassParagraph).testo, set: (c, v) => { (list(c)![j] as ClassParagraph).testo = v; },
    });
  });
  card.diventare?.parti.forEach((parte, k) => paragraphsOf(`diventare-${k + 1}`, parte.titolo, c => c.diventare?.parti[k].contenuto));
  paragraphsOf("intro", "Privilegi di classe", c => c.introPrivilegi?.contenuto);
  const features = (prefix: string, label: string, list: (c: ClassData) => ClassFeature[]) => list(card).forEach((feature, k) => {
    const name = `${label}Livello ${feature.livello}: ${feature.titolo}`;
    fields.push({ key: `${prefix}-${k + 1}-titolo`, label: `${name} · titolo`, get: c => list(c)[k].titolo, set: (c, v) => { list(c)[k].titolo = v; } });
    paragraphsOf(`${prefix}-${k + 1}`, name, c => list(c)[k].contenuto);
  });
  features("privilegio", "", c => c.privilegi);
  card.opzioni.forEach((option, o) => {
    paragraphsOf(`opzione-${o + 1}-intro`, option.titolo, c => c.opzioni[o].intro);
    option.voci.forEach((voce, v) => {
      fields.push({ key: `opzione-${o + 1}-${v + 1}-titolo`, label: `${option.titolo} · ${voce.titolo} · titolo`, get: c => c.opzioni[o].voci[v].titolo, set: (c, value) => { c.opzioni[o].voci[v].titolo = value; } });
      paragraphsOf(`opzione-${o + 1}-${v + 1}`, `${option.titolo} · ${voce.titolo}`, c => c.opzioni[o].voci[v].contenuto);
    });
  });
  paragraphsOf("incantesimi-intro", card.incantesimi?.titolo ?? "Lista degli incantesimi", c => c.incantesimi?.intro);
  fields.push({ key: "sottoclasse-nome", label: "Sottoclasse · nome", get: c => c.sottoclasse.nome, set: (c, v) => { c.sottoclasse.nome = v; } });
  if (card.sottoclasse.motto) fields.push({ key: "sottoclasse-motto", label: "Sottoclasse · motto", get: c => c.sottoclasse.motto!.testo, set: (c, v) => { c.sottoclasse.motto!.testo = v; } });
  paragraphsOf("sottoclasse-descrizione", "Sottoclasse · descrizione", c => c.sottoclasse.descrizione);
  features("sottoclasse", "Sottoclasse · ", c => c.sottoclasse.privilegi);
  return fields;
}

export const classAdapter: CardAdapter<ClassData> = {
  read: card => Object.fromEntries(classFields(card).map(field => [field.key, field.get(card)])),
  write: (card, values) => {
    const copy = structuredClone(card);
    for (const field of classFields(card)) if (values[field.key] !== undefined) field.set(copy, values[field.key]);
    return copy;
  },
  label: (card, key) => classFields(card).find(field => field.key === key)?.label,
};
