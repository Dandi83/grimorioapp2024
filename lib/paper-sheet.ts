import {
  ABILITIES,
  modifier,
  proficiency,
  signed,
  checkBonus,
  commitName,
  commitNumber,
  normalizeCharacter,
  type Character,
  type Ability,
} from "./characters";
const scoreNames: Record<string, Ability> = {
  "Forza 1": "Forza",
  Destrezza: "Destrezza",
  Costituzione: "Costituzione",
  Intelligenza: "Intelligenza",
  Saggezza: "Saggezza",
  Carisma: "Carisma",
};
const modifierNames: Record<string, Ability> = {
  "Forza 2": "Forza",
  "Destrezza 2": "Destrezza",
  "Costituzione 2": "Costituzione",
  "Intelligenza 2": "Intelligenza",
  "Saggezza  2": "Saggezza",
  "Carisma 2": "Carisma",
};
const skillNames: Record<string, [string, Ability]> = {
  "Forza atletica": ["Atletica", "Forza"],
  "Destrezza acrobazia": ["Acrobazia", "Destrezza"],
  "Destrezza furtività": ["Furtività", "Destrezza"],
  "Destrezza rapidità mano": ["Rapidità di Mano", "Destrezza"],
  "Intelligenza arcano": ["Arcano", "Intelligenza"],
  "Intelligenza investigare": ["Indagare", "Intelligenza"],
  "Intelligenza natura": ["Natura", "Intelligenza"],
  "Intelligenza religione": ["Religione", "Intelligenza"],
  "Intelligenza storia": ["Storia", "Intelligenza"],
  "Saggezza empatia animale": ["Addestrare Animali", "Saggezza"],
  "Saggezza intuizione": ["Intuizione", "Saggezza"],
  "Saggezza medicina": ["Medicina", "Saggezza"],
  "Saggezza percezione": ["Percezione", "Saggezza"],
  "Saggezza sopravvivenza": ["Sopravvivenza", "Saggezza"],
  "Carisma intimidire": ["Intimidire", "Carisma"],
  "Carisma ingannare": ["Inganno", "Carisma"],
  "Carisma intrattenere": ["Intrattenere", "Carisma"],
  "Carisma persuadere": ["Persuasione", "Carisma"],
};
const plain: Record<string, keyof Character> = {
  Nome: "name",
  Background: "background",
  Razza: "species",
  "Classe armatura": "ac",
  "PUNTI FERITA TOTALI": "hpMax",
  Ferite: "hp",
  "PF temp": "tempHp",
  "DADI VITA TOTALI": "hitDice",
  "Movimento base": "speed",
};
const coins = ["mp", "mo", "me", "ma", "mc"] as const;
function saving(name: string) {
  return ABILITIES.find(
    (a) => name.replace(/\s/g, "") === `${a}ts` || name.replace(/\s/g, "") === `${a}ts2`,
  );
}
function skill(name: string) {
  const normalized = name.replace(/\s+/g, " ").trim();
  for (const [prefix, values] of Object.entries(skillNames)) {
    if (normalized === prefix) return { values, kind: 1 };
    if (normalized === `${prefix} 2`) return { values, kind: 2 };
    if (normalized === `${prefix} 3`) return { values, kind: 3 };
  }
}
export function getPaperValue(c: Character, name: string): string | boolean {
  if (c.paperFields && Object.hasOwn(c.paperFields, name)) return c.paperFields[name];
  if (plain[name]) return String(c[plain[name]] ?? "");
  if (scoreNames[name]) return String(c.scores[scoreNames[name]]);
  if (name === "Classe e livello") return `${c.className}${c.className ? " " : ""}${c.level}`;
  if (name === "Iniziativa")
    return c.initiativeOverride !== ""
      ? c.initiativeOverride
      : signed(modifier(c.scores.Destrezza) + c.initiativeBonus);
  if (name === "CDspell")
    return c.spellDcOverride || String(8 + proficiency(c.level) + modifier(c.scores[c.casting]));
  if (name === "Knwspell")
    return c.spellAttackOverride || signed(proficiency(c.level) + modifier(c.scores[c.casting]));
  if (name === "Knwspell2") return String(c.spells.filter((s) => s.prepared).length);
  if (name === "CarRil01") return c.className;
  if (name === "CarRil") return c.casting;
  if (c.paperFields && Object.hasOwn(c.paperFields, name)) return c.paperFields[name];
  if (modifierNames[name]) return signed(modifier(c.scores[modifierNames[name]]));
  if (name === "Bonus competenza") return signed(proficiency(c.level));
  const save = saving(name);
  if (save)
    return /2$/.test(name)
      ? signed(checkBonus(c.scores[save], c.level, c.saves[save] ? 1 : 0))
      : !!c.saves[save];
  const sk = skill(name);
  if (sk) {
    const [label, a] = sk.values;
    const val = c.skills[label] || { rank: 0, bonus: 0 };
    return sk.kind === 3
      ? signed(checkBonus(c.scores[a], c.level, val.rank, val.bonus))
      : sk.kind === 2
        ? val.rank === 2
        : val.rank > 0;
  }
  if (name === "Percezione" || name === "Ispirazione") {
    const skill = name === "Percezione" ? "Percezione" : "Indagare";
    const ability = name === "Percezione" ? "Saggezza" : "Intelligenza";
    const s = c.skills[skill] || { rank: 0, bonus: 0 };
    return String(10 + checkBonus(c.scores[ability], c.level, s.rank, s.bonus));
  }
  const death = /^TSM01\.(?:(3)\.)?([0-2])$/.exec(name);
  if (death) return (death[1] ? c.deathFailure : c.deathSuccess) > Number(death[2]);
  const money = /^MP\.([0-4])$/.exec(name);
  if (money) return String(c.coins[coins[Number(money[1])]]);
  const item = /^Oggetto\.(\d+)$/.exec(name);
  if (item) return c.inventory[Number(item[1])]?.name || "";
  const note = /^Note\.(\d+)$/.exec(name);
  if (note) return c.notes.split("\n")[Number(note[1])] || "";
  const attack = /^Arma ([1-5])(?: (attacco|danno|note|gittata|peso))?(a)?$/.exec(name);
  if (attack) {
    const a = c.attacks[attack[3] ? 5 : Number(attack[1]) - 1];
    if (!a) return "";
    return attack[2] === "attacco"
      ? a.bonus
      : attack[2] === "danno"
        ? a.damage
        : attack[2] === "note"
          ? a.notes
          : !attack[2]
            ? a.name
            : "";
  }
  const maxSlot = /^spl01\.([0-8])$/.exec(name);
  if (maxSlot) return String(c.slots[Number(maxSlot[1])]?.max || 0);
  return "";
}
export function setPaperValue(c: Character, name: string, value: string | boolean): Character {
  const text = String(value);
  let patch: Partial<Character> = {};
  if (plain[name]) {
    const key = plain[name];
    patch = {
      [key]: ["ac", "hpMax", "hp", "tempHp", "speed"].includes(key)
        ? commitNumber(text, key === "hpMax" ? 1 : 0, 9999)
        : key === "name"
          ? commitName(text)
          : text,
    };
  } else if (scoreNames[name])
    patch = { scores: { ...c.scores, [scoreNames[name]]: commitNumber(text, 1, 30) } };
  else if (name === "Classe e livello") {
    const parsed = /^(.*?)\s*(\d{1,2})$/.exec(text.trim());
    patch = parsed
      ? { className: parsed[1].trim(), level: commitNumber(parsed[2], 1, 20) }
      : { className: text.slice(0, 100) };
  } else if (name === "Iniziativa") patch = { initiativeOverride: text };
  else if (name === "CDspell") patch = { spellDcOverride: text };
  else if (name === "Knwspell") patch = { spellAttackOverride: text };
  else if (name === "CarRil01") patch = { className: text };
  else if (name === "CarRil" && ABILITIES.includes(text as Ability))
    patch = { casting: text as Ability };
  else if (saving(name) && !/2$/.test(name)) {
    patch = { saves: { ...c.saves, [saving(name)!]: !!value } };
  } else if (skill(name) && skill(name)!.kind !== 3) {
    const {
      values: [label],
      kind,
    } = skill(name)!;
    const prev = c.skills[label] || { rank: 0, bonus: 0 };
    patch = {
      skills: {
        ...c.skills,
        [label]: {
          ...prev,
          rank:
            kind === 2 ? (value ? 2 : Math.min(1, prev.rank)) : value ? Math.max(1, prev.rank) : 0,
        },
      },
    };
  } else if (/^MP\.[0-4]$/.test(name)) {
    patch = {
      coins: { ...c.coins, [coins[Number(name.split(".")[1])]]: commitNumber(text, 0, 999999) },
    };
  } else if (/^Note\.\d+$/.test(name)) {
    const lines = c.notes.split("\n");
    lines[Number(name.split(".")[1])] = text;
    patch = { notes: Array.from(lines, (v) => v || "").join("\n") };
  } else if (/^Oggetto\.\d+$/.test(name)) {
    const index = Number(name.split(".")[1]);
    const inventory = [...c.inventory];
    while (inventory.length <= index)
      inventory.push({
        id: crypto.randomUUID(),
        name: "",
        quantity: 1,
        weight: "",
        equipped: false,
      });
    inventory[index] = { ...inventory[index], name: text };
    patch = { inventory };
  } else if (/^TSM01\.(?:(3)\.)?([0-2])$/.test(name)) {
    const match = /^TSM01\.(?:(3)\.)?([0-2])$/.exec(name)!;
    patch = {
      [match[1] ? "deathFailure" : "deathSuccess"]: value ? Number(match[2]) + 1 : Number(match[2]),
    };
  } else if (/^Arma [1-5](?: (?:attacco|danno|note))?a?$/.test(name)) {
    const match = /^Arma ([1-5])(?: (attacco|danno|note))?(a)?$/.exec(name)!;
    const index = match[3] ? 5 : Number(match[1]) - 1;
    const attacks = [...c.attacks];
    while (attacks.length <= index)
      attacks.push({ id: crypto.randomUUID(), name: "", bonus: "", damage: "", notes: "" });
    const key =
      match[2] === "attacco"
        ? "bonus"
        : match[2] === "danno"
          ? "damage"
          : match[2] === "note"
            ? "notes"
            : "name";
    attacks[index] = { ...attacks[index], [key]: text };
    patch = { attacks };
  } else if (/^spl01\.[0-8]$/.test(name)) {
    const i = Number(name.split(".")[1]);
    const max = commitNumber(text, 0, 99);
    patch = {
      slots: c.slots.map((s, j) =>
        j === i ? { ...s, max, current: Math.min(s.current, max) } : s,
      ),
    };
  } else patch = { paperFields: { ...c.paperFields, [name]: value } };
  const paperFields = { ...c.paperFields };
  delete paperFields[name];
  return normalizeCharacter({ ...c, paperFields, ...patch });
}
