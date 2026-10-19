import { getPaperValue, setPaperValue } from "./paper-sheet";
import type { Character } from "./characters";
import template from "./data/character-paper-fields.json";
export type DigitalField = {
  name: string;
  label: string;
  type: "text" | "checkbox";
  automatic?: boolean;
  long?: boolean;
};
export type DigitalGroup = { id: string; title: string; fields: DigitalField[] };
const source = template.fields.filter((f) => f.page === 1);
function field(name: string, label: string, automatic = false, long = false): DigitalField {
  const original = source.find((f) => f.name === name);
  if (!original) throw new Error(`Missing first-page parameter: ${name}`);
  return { name, label, type: original.type as "text" | "checkbox", automatic, long };
}
const group = (id: string, title: string, fields: DigitalField[]): DigitalGroup => ({
  id,
  title,
  fields,
});
export const abilityNames = [
  "Forza",
  "Destrezza",
  "Costituzione",
  "Intelligenza",
  "Saggezza",
  "Carisma",
];
const skillLabels: Record<string, string> = {
  "Forza atletica": "Atletica",
  "Destrezza acrobazia": "Acrobazia",
  "Destrezza furtività": "Furtività",
  "Destrezza rapidità mano": "Rapidità di mano",
  "Intelligenza arcano": "Arcano",
  "Intelligenza investigare": "Indagare",
  "Intelligenza natura": "Natura",
  "Intelligenza religione": "Religione",
  "Intelligenza storia": "Storia",
  "Saggezza empatia animale": "Addestrare animali",
  "Saggezza intuizione": "Intuizione",
  "Saggezza medicina": "Medicina",
  "Saggezza percezione": "Percezione",
  "Saggezza sopravvivenza": "Sopravvivenza",
  "Carisma intimidire": "Intimidire",
  "Carisma ingannare": "Inganno",
  "Carisma intrattenere": "Intrattenere",
  "Carisma persuadere": "Persuasione",
};
export const digitalGroups: DigitalGroup[] = [
  group("identity", "Identità e progressione", [
    field("Nome", "Nome del personaggio"),
    field("Classe e livello", "Classe e livello"),
    field("Razza", "Specie"),
    field("Background", "Background"),
    field("Allineamento", "Allineamento"),
    field("Nome Giocatore", "Nome del giocatore"),
    field("Punti Esperienza", "Punti esperienza"),
    field("PE livello successivo", "PE per il prossimo livello"),
  ]),
  group("combat", "Valori di combattimento", [
    field("Classe armatura", "Classe armatura"),
    field("Iniziativa", "Iniziativa", true),
    field("Bonus competenza", "Bonus di competenza", true),
    field("VRI1.5", "Ispirazione"),
  ]),
  group("hp", "Punti ferita", [
    field("Ferite", "PF attuali"),
    field("PUNTI FERITA TOTALI", "PF massimi"),
    field("PF temp", "PF temporanei"),
  ]),
  group(
    "armor",
    "Armatura, scudo e protezioni",
    Array.from({ length: 4 }, (_, i) =>
      field(`CA1.${i}`, ["Armatura", "Scudo", "Altre protezioni", "Note sulla difesa"][i]),
    ),
  ),
  group(
    "resistances",
    "Vantaggi, resistenze e immunità",
    Array.from({ length: 5 }, (_, i) =>
      field(
        `VRI1.${i}`,
        ["Vantaggi", "Resistenze", "Immunità", "Altri effetti", "Note e limitazioni"][i],
        false,
        true,
      ),
    ),
  ),
  group("hitdice", "Dadi vita", [
    field("DADI VITA TOTALI", "Dadi vita totali"),
    ...source
      .filter((f) => f.name.startsWith("DV"))
      .map((f, i) => field(f.name, `Dado vita ${i + 1} usato`)),
  ]),
  group(
    "death-success",
    "Successi contro morte",
    Array.from({ length: 3 }, (_, i) => field(`TSM01.${i}`, `Successo ${i + 1}`)),
  ),
  group(
    "death-failure",
    "Fallimenti contro morte",
    Array.from({ length: 3 }, (_, i) => field(`TSM01.3.${i}`, `Fallimento ${i + 1}`)),
  ),
  group("senses", "Sensi e movimento", [
    field("Percezione", "Percezione passiva", true),
    field("Ispirazione", "Indagare passivo", true),
    field("Visione", "Visione"),
    field("Movimento base", "Velocità (m)"),
    field("Movimento ora", "Distanza in un’ora"),
    field("Movimento al giorno", "Distanza al giorno"),
    field("Movimento speciale", "Movimenti speciali"),
  ]),
  ...abilityNames.map((a) =>
    group(`ability-${a}`, a, [
      field(a === "Forza" ? "Forza 1" : a, "Punteggio"),
      field(
        a === "Forza" ? "Forza 2" : a === "Saggezza" ? "Saggezza  2" : `${a} 2`,
        "Modificatore",
        true,
      ),
      ...source
        .filter((f) => new RegExp(`^${a} ts`).test(f.name))
        .map((f) =>
          field(
            f.name,
            f.type === "checkbox" ? "Competenza nel tiro salvezza" : "Bonus tiro salvezza",
            f.type !== "checkbox",
          ),
        ),
    ]),
  ),
  ...Object.entries(skillLabels).map(([prefix, label]) =>
    group(
      `skill-${prefix}`,
      label,
      source
        .filter((f) => {
          const n = f.name.replace(/\s+/g, " ");
          return n === prefix || n === `${prefix} 2` || n === `${prefix} 3`;
        })
        .map((f, i) => field(f.name, ["Competenza", "Maestria", "Bonus abilità"][i], i === 2)),
    ),
  ),
  ...Array.from({ length: 6 }, (_, i) => {
    const stem = i === 5 ? "Arma 5" : "Arma " + (i + 1);
    const suffix = i === 5 ? "a" : "";
    return group(`attack-${i}`, `Attacco ${i + 1}`, [
      field(stem + suffix, "Arma o attacco"),
      ...["attacco", "danno", "gittata", "peso", "note"].map((key, j) =>
        field(
          `${stem} ${key}${suffix}`,
          ["Tiro per colpire", "Danni e tipo", "Gittata", "Peso", "Note e proprietà"][j],
          false,
          key === "note",
        ),
      ),
    ]);
  }),
  ...Array.from({ length: 3 }, (_, i) =>
    group(`ammo-${i}`, `Munizioni ${i + 1}`, [
      field(`Munizioni ${i + 1}`, "Tipo di munizioni"),
      ...source
        .filter((f) => f.name.startsWith("ammo#"))
        .slice(i * 20, (i + 1) * 20)
        .map((f, j) => field(f.name, `Munizione ${j + 1}`)),
    ]),
  ),
  ...Array.from({ length: 8 }, (_, i) =>
    group(`feature-${i}`, `Capacità ${i + 1}`, [
      field(`Riferimento01.${i + 1}`, "Talento, privilegio o capacità", false, true),
      field(`Riferimento check.${i + 1}`, "Recupero con riposo lungo"),
      ...Array.from({ length: 5 }, (_, j) => field(`RIF.${j}.${i + 1}`, `Uso ${j + 1} speso`)),
    ]),
  ),
];
export function digitalGroup(id: string): DigitalGroup {
  const g = digitalGroups.find((g) => g.id === id);
  if (!g) throw new Error(`Unknown group ${id}`);
  return g;
}

export function commitDigitalValue(c: Character, name: string, draft: string): Character {
  return draft === String(getPaperValue(c, name)) ? c : setPaperValue(c, name, draft);
}
