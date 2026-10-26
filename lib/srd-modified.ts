import { srdDescriptionDifferences } from "./srd-descriptions";
import { srdMonsterDifferences, srdMonsterRecordEdition } from "./srd-monsters";
import { isLegacySpellId, legacySpellDifferences } from "./srd-spells-2014";
import { wordDiff, type DiffPart } from "./word-diff";

/**
 * «Schede SRD modificate» (reserved area): spells and creatures with an SRD record of the same id whose text no
 * longer matches it, so the card has lost its source box. The differences come from the very functions that decide
 * the box (lib/srd-spells-2014.ts, lib/srd-descriptions.ts, lib/srd-monsters.ts), approved display repairs
 * included: the list and the box can never disagree. Pure: the server reads the cards (lib/srd-modified-server.ts).
 */

export type SrdCardKind = "incantesimo" | "mostro";

export interface SrdFieldDifference {
  field: string;
  label: string;
  /** The exact SRD value, the one «Ripristina testo SRD» writes back. */
  srd: string;
  current: string;
  diff: DiffPart[];
}

export interface SrdModifiedCard {
  kind: SrdCardKind;
  id: string;
  name: string;
  edition: "2014" | "2024";
  href: string;
  fields: SrdFieldDifference[];
}

const LABELS: Record<string, string> = {
  nome_italiano: "Nome", nome: "Nome", livello: "Livello e scuola", tempo_di_lancio: "Tempo di lancio", gittata: "Gittata",
  componenti: "Componenti", durata: "Durata", descrizione: "Descrizione", tipo: "Tipo", taglia: "Taglia", allineamento: "Allineamento",
  grado_sfida: "Grado di sfida", px: "PE", classe_armatura: "Classe Armatura", punti_ferita: "Punti ferita", velocita: "Velocità",
  forza: "Forza", destrezza: "Destrezza", costituzione: "Costituzione", intelligenza: "Intelligenza", saggezza: "Saggezza", carisma: "Carisma",
  tiri_salvezza: "Tiri salvezza", abilita: "Abilità", vulnerabilita: "Vulnerabilità", resistenze: "Resistenze", immunita_danni: "Immunità ai danni",
  immunita_condizioni: "Immunità alle condizioni", immunita: "Immunità", sensi: "Sensi", linguaggi: "Linguaggi", tratti: "Tratti", azioni: "Azioni",
  azioni_bonus: "Azioni bonus", reazioni: "Reazioni", azioni_leggendarie: "Azioni leggendarie", attrezzatura: "Attrezzatura",
  sottotitolo_fonte: "Sottotitolo", iniziativa: "Iniziativa", bonus_competenza: "Bonus di competenza",
};

/** The fields of a spell that differ from its SRD record (2014 or 2024); undefined when the id has no record. */
export function spellSrdDifferences(spell: { id: string; descrizione: string } & Record<string, unknown>) {
  return isLegacySpellId(spell.id)
    ? legacySpellDifferences(spell as Parameters<typeof legacySpellDifferences>[0])
    : srdDescriptionDifferences(spell.id, spell.descrizione);
}

/** The fields of a creature that differ from its SRD record; undefined when the id has no record. */
export function monsterSrdDifferences(monster: { id: string } & object) {
  return srdMonsterDifferences(monster);
}

const text = (value: unknown) => (value === null || value === undefined ? "" : String(value));

function card(kind: SrdCardKind, id: string, name: string, edition: "2014" | "2024", values: Record<string, unknown>, differences: { field: string; srd: string | number }[]): SrdModifiedCard {
  return {
    kind, id, name, edition,
    href: kind === "incantesimo" ? `/spell/${id}` : `/mostro/${id}`,
    fields: differences.map(({ field, srd }) => ({
      field, label: LABELS[field] ?? field, srd: text(srd), current: text(values[field]), diff: wordDiff(text(srd), text(values[field])),
    })),
  };
}

/** A spell as the public card shows it, when it has an SRD record and no longer matches it. */
export function modifiedSpell(spell: { id: string; nome_italiano: string; descrizione: string } & Record<string, unknown>): SrdModifiedCard | undefined {
  const differences = spellSrdDifferences(spell);
  if (!differences?.length) return undefined;
  return card("incantesimo", spell.id, spell.nome_italiano, isLegacySpellId(spell.id) ? "2014" : "2024", spell, differences);
}

/** A creature as the public card shows it, when it has an SRD record and no longer matches it. */
export function modifiedMonster(monster: { id: string; nome: string } & Record<string, unknown>): SrdModifiedCard | undefined {
  const differences = monsterSrdDifferences(monster);
  const edition = srdMonsterRecordEdition(monster.id);
  if (!differences?.length || !edition) return undefined;
  return card("mostro", monster.id, monster.nome, edition, monster, differences);
}

/** Every modified SRD card, spells first, by name. */
export function srdModifiedCards(
  spells: readonly ({ id: string; nome_italiano: string; descrizione: string } & Record<string, unknown>)[],
  monsters: readonly ({ id: string; nome: string } & Record<string, unknown>)[],
): SrdModifiedCard[] {
  const byName = (a: SrdModifiedCard, b: SrdModifiedCard) => a.name.localeCompare(b.name, "it") || a.edition.localeCompare(b.edition);
  return [
    ...spells.flatMap(spell => modifiedSpell(spell) ?? []).sort(byName),
    ...monsters.flatMap(monster => modifiedMonster(monster) ?? []).sort(byName),
  ];
}

/**
 * The editor form of «Ripristina testo SRD»: the id and, for the fields that differ only, the exact SRD value.
 * The other fields are not sent, so the editor action leaves them as they are.
 */
export function restoreEntries(item: Pick<SrdModifiedCard, "id" | "fields">): [string, string][] {
  // «gs_num» is not a field of the editor: it follows the challenge rating.
  return [["id", item.id], ...item.fields.filter(({ field }) => field !== "gs_num").map(({ field, srd }) => [field, srd] as [string, string])];
}
