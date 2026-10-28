import "server-only";
import { spellEdition, type AdminEdition } from "./admin-edition";
import { challengeGroup, naturalGroups, spellGroup, type AdminListData, type AdminRow } from "./admin-list-types";
import { isNoSrdSource, type CardSource } from "./card-display";
import { activeOverrideMap } from "./content-overrides-apply";
import { allOverrides } from "./content-overrides";
import { CONTENT_SECTIONS, fieldLabels, sectionSpec } from "./content-sections";
import { homebrewMonster, publishedHomebrew } from "./homebrew";
import { getAllMonsters } from "./monsters";
import { typeCategory } from "./monsters-types";
import { getReviewNameCards } from "./review-names-server";
import { cardPath, hiddenCardPaths } from "./section-visibility";
import { getAdminSpells } from "./spells";
import { spellName } from "./spell-name";
import { getSrdModifiedCards } from "./srd-modified-server";
import { usesLegacyMonsterRules } from "./srd-monsters";
import { wordDiff } from "./word-diff";
import { publicSpellId, spellHref } from "./spell-public-id";
import { readFavoriteCounts } from "./analytics";

/**
 * The lists of the reserved area as rows (lib/admin-list-types.ts): spells, creatures with the homebrew, and every
 * section of lib/content-sections.ts, in the edition chosen. Server only, read on every request, reserved area only.
 */

type Pill = AdminRow["pill"];
const pillOf = (source: CardSource | string | undefined, homebrew = false): Pill =>
  homebrew ? "Homebrew" : source === "Sintesi originale" ? "Sintesi" : source === "Aggiunta da te" ? "Aggiunta da te" : undefined;

async function checks() {
  const [modified, names, hidden, saves] = await Promise.all([
    getSrdModifiedCards().catch(() => []), getReviewNameCards().catch(() => []), hiddenCardPaths().catch(() => [] as string[]),
    readFavoriteCounts().catch(() => []),
  ]);
  const modifiedOf = new Map(modified.map(card => [`${card.kind}:${card.id}`, card.fields.map(field => ({ label: field.label, diff: field.diff }))]));
  const namesOf = new Map(names.map(card => [`${card.kind}:${card.id}`, card.found]));
  // The stars are counted on the address id (a spell renamed by PROMPT 8 on its new address).
  const savesOf = new Map(saves.map(row => [`${row.kind}:${row.id}`, row.people]));
  return { modifiedOf, namesOf, hidden: new Set(hidden), savesOf };
}

export async function spellList(edition: AdminEdition): Promise<AdminListData> {
  const [spells, { modifiedOf, namesOf, hidden, savesOf }] = await Promise.all([getAdminSpells(), checks()]);
  const rows = spells.filter(spell => spellEdition(spell) === edition).map((spell): AdminRow => {
    const key = `incantesimo:${spell.id}`;
    const modified = modifiedOf.get(key);
    const source = spell.fonte_scheda ?? spell.origine;
    return {
      id: spell.id, name: spell.nome_mostrato ?? spellName(spell.nome_italiano, spell.edizione), sub: spell.scuola || "Scuola da indicare",
      lead: spell.livello_num === 0 ? "T" : spell.livello_num > 0 ? String(spell.livello_num) : "?", group: spellGroup(spell.livello_num),
      // NO SRD as in the rest of the app (lib/provenance.ts): summaries, cards added here and SRD cards modified.
      source: modified || isNoSrdSource(source as CardSource) ? "nosrd" : "srd", pill: modified ? undefined : pillOf(source),
      modified, reviewNames: namesOf.get(key), hidden: hidden.has(cardPath("incantesimo", spell.id)),
      // «Chiudi editor» comes back to the list.
      editHref: `/admin/incantesimi/${encodeURIComponent(spell.id)}?ritorno=%2Fadmin%2Fincantesimi`, publicHref: spellHref(spell.id),
      ...(savesOf.get(`incantesimo:${publicSpellId(spell.id)}`) ? { saves: savesOf.get(`incantesimo:${publicSpellId(spell.id)}`) } : {}),
      ...(spell.fonte ? {} : { deletable: "spell" as const }),
    };
  });
  rows.sort((a, b) => a.group.order - b.group.order || a.name.localeCompare(b.name, "it"));
  return { kind: "incantesimo", section: "incantesimi", title: "Incantesimi", edition, rows };
}

export async function monsterList(edition: AdminEdition): Promise<AdminListData> {
  const [monsters, homebrew, { modifiedOf, namesOf, hidden, savesOf }] = await Promise.all([getAllMonsters(), publishedHomebrew().catch(() => []), checks()]);
  const ofEdition = monsters.filter(monster => (usesLegacyMonsterRules(monster) ? "2014" : "2024") === edition);
  const brewed = homebrew.filter(row => row.edizione === edition || row.edizione === "entrambe").map(homebrewMonster);
  const rows = [...ofEdition, ...brewed].map((monster): AdminRow => {
    const key = `mostro:${monster.id}`;
    const isHomebrew = !!monster.homebrew_edizione;
    const modified = modifiedOf.get(key);
    return {
      id: monster.id, name: monster.nome, sub: [typeCategory(monster.tipo) || monster.tipo, monster.taglia].filter(Boolean).join(" · "),
      lead: monster.grado_sfida || "?", group: challengeGroup(monster.grado_sfida, monster.gs_num),
      source: modified || isHomebrew || isNoSrdSource(monster.fonte_scheda) ? "nosrd" : "srd", pill: modified ? undefined : pillOf(monster.fonte_scheda, isHomebrew),
      modified, reviewNames: namesOf.get(key), hidden: hidden.has(`/mostro/${monster.id}`),
      editHref: `/admin/mostri/${encodeURIComponent(monster.id)}?ritorno=%2Fadmin%2Fmostri`, publicHref: `/mostro/${monster.id}`,
      ...(savesOf.get(key) ? { saves: savesOf.get(key) } : {}),
      ...(monster.provenienza ? {} : { deletable: isHomebrew ? "homebrew" as const : "monster" as const }),
    };
  }).sort((a, b) => a.group.order - b.group.order || a.name.localeCompare(b.name, "it"));
  return { kind: "mostro", section: "mostri", title: "Mostri", edition, rows };
}

/** A section of lib/content-sections.ts: SRD files; a correction in force is an «SRD modificata» (and NO SRD, as above). */
export async function contentList(key: string, edition: AdminEdition): Promise<AdminListData | undefined> {
  const section = sectionSpec(key);
  if (!section || !section.editions.includes(edition)) return undefined;
  const overrides = [...activeOverrideMap((await allOverrides()).filter(row => row.sezione === key && row.edizione === edition)).values()];
  const items = section.items(edition);
  const groupOf = naturalGroups(items);
  const rows = items.map((item): AdminRow => {
    const changes = overrides.filter(row => row.scheda_id === item.id);
    const labels = changes.length ? fieldLabels(key, item.id, edition) : {};
    return {
      id: item.id, name: item.nome, sub: item.etichetta, group: groupOf(item), source: changes.length ? "nosrd" : "srd",
      modified: changes.length ? changes.map(row => ({ label: labels[row.campo] ?? row.campo, diff: wordDiff(row.valore_originale, row.valore_nuovo) })) : undefined,
      hidden: null, editHref: `/admin/contenuti/${key}/${encodeURIComponent(item.id)}?edizione=${edition}`, publicHref: section.href(item.id, edition),
    };
  });
  return { kind: "contenuto", section: key, title: section.title, edition, rows };
}

/** «Cerca qualsiasi scheda da modificare»: every card of the edition, with the editor it opens. */
export async function editableEntries(edition: AdminEdition): Promise<{ name: string; kind: string; href: string }[]> {
  const [spells, monsters] = await Promise.all([spellList(edition).catch(() => null), monsterList(edition).catch(() => null)]);
  return [
    ...(spells?.rows ?? []).map(row => ({ name: row.name, kind: `Incantesimo · ${row.sub}`, href: row.editHref })),
    ...(monsters?.rows ?? []).map(row => ({ name: row.name, kind: `${row.pill === "Homebrew" ? "Homebrew" : "Mostro"} · ${row.group.label}`, href: row.editHref })),
    ...CONTENT_SECTIONS.filter(section => section.editions.includes(edition)).flatMap(section => section.items(edition).map(item => ({
      name: item.nome, kind: `${section.title}${item.etichetta ? ` · ${item.etichetta}` : ""}`, href: `/admin/contenuti/${section.key}/${encodeURIComponent(item.id)}?edizione=${edition}`,
    }))),
  ];
}

