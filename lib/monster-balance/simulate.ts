import type { Attack, Dice, LegendaryOption, MonsterModel, SaveAbility } from "./parse";
import { cleric, fighter, heroDc, levelOf, party, rogue, wizard, type Hero } from "./party";
import { roll, seededRandom, type Random } from "./random";

/** The averages of many fights against the reference group. */
export type BalanceMetrics = {
  /** Damage really taken from the characters (never beyond 0) per round. */
  damagePerRound: number;
  /** Rounds the monster lasts (15 at most). */
  rounds: number;
  /** Fights with at least one character at 0 hit points, in %. */
  downPct: number;
  /** Fights with the whole group at 0, in %. */
  wipePct: number;
};

export const MAX_ROUNDS = 15;
export const SEED = 20261029;

function rollDice(random: Random, dice: Dice[], critical = false): number {
  let total = 0;
  for (const group of dice) {
    for (let i = 0; i < group.count * (critical ? 2 : 1); i++) total += roll(random, group.sides);
    total += group.flat;
  }
  return Math.max(0, total);
}

const attackValue = (attack: Attack, times = 1) => attack.average * times * 0.6;
const saveValue = (save: SaveAbility) => save.average * save.targets * (save.half ? 0.75 : 0.55);
const optionValue = (option: LegendaryOption) => (option.kind === "attack" ? attackValue(option.attack) : saveValue(option.save)) / option.cost;

type Fighter = Hero & { current: number; down: boolean };

/** One fight; returns the damage taken from the characters, the rounds, whether one fell and whether all fell. */
function fight(model: MonsterModel, level: number, random: Random) {
  const heroes: Fighter[] = party(level).map(hero => ({ ...hero, current: hero.hp, down: false }));
  const best = model.attacks.reduce<Attack | undefined>((top, attack) => (!top || attack.average > top.average ? attack : top), undefined);
  const multiValue = best ? attackValue(best, model.multiattack) : 0;
  const ready = model.abilities.map(() => true);
  const usesLeft = model.abilities.map(ability => ability.perDay ?? Infinity);
  const f = fighter(level), c = cleric(level), r = rogue(level), w = wizard(level);
  const slots = w.spells.map(spell => spell.slots);
  let shields = w.shields, heals = c.heals, resistances = model.legendaryResistance;
  let monster = model.hp, dealt = 0, anyDown = false;
  let legendary = model.legendary.uses;
  let usedOnce = new Set<string>();

  const standing = () => heroes.filter(hero => !hero.down);
  const pick = () => { const up = standing(); return up[Math.floor(random() * up.length)]; };
  const hurt = (hero: Fighter, damage: number) => {
    const taken = Math.min(hero.current, damage);
    hero.current -= taken; dealt += taken;
    if (hero.current <= 0) { hero.down = true; anyDown = true; }
  };
  const monsterAttack = (attack: Attack) => {
    const target = pick();
    if (!target) return;
    const die = roll(random, 20);
    if (die === 1) return;
    const total = die + attack.bonus;
    if (die !== 20 && total < target.ac) return;
    // The wizard's Shield: +5 AC against a hit it can turn into a miss.
    if (die !== 20 && target.kind === "mago" && shields > 0 && total < target.ac + 5) { shields--; return; }
    hurt(target, rollDice(random, attack.dice, die === 20));
  };
  const monsterSave = (save: SaveAbility) => {
    const up = standing();
    const targets: Fighter[] = [];
    while (targets.length < Math.min(save.targets, up.length)) {
      const hero = up[Math.floor(random() * up.length)];
      if (!targets.includes(hero)) targets.push(hero);
    }
    const damage = rollDice(random, save.dice);
    for (const hero of targets) {
      const success = roll(random, 20) + hero.saves[save.ability] >= save.dc;
      hurt(hero, success ? (save.half ? Math.floor(damage / 2) : 0) : damage);
    }
  };
  const monsterTurn = () => {
    // Regeneration: at the start of its turn, only while it still has hit points, never beyond its maximum.
    if (model.regeneration && monster > 0) monster = Math.min(model.hp, monster + model.regeneration);
    legendary = model.legendary.uses;
    usedOnce = new Set();
    model.abilities.forEach((ability, i) => { if (!ready[i] && ability.recharge && roll(random, 6) >= ability.recharge) ready[i] = true; });
    let chosen = -1, value = 0;
    model.abilities.forEach((ability, i) => {
      if (ready[i] && usesLeft[i] > 0 && saveValue(ability) > value) { chosen = i; value = saveValue(ability); }
    });
    if (chosen >= 0 && (value >= 0.8 * multiValue || !best)) {
      const ability = model.abilities[chosen];
      if (ability.recharge) ready[chosen] = false;
      usesLeft[chosen]--;
      monsterSave(ability);
    } else if (best) for (let i = 0; i < model.multiattack; i++) monsterAttack(best);
  };
  const legendaryAction = () => {
    if (monster <= 0 || legendary <= 0 || !standing().length) return;
    let chosen: LegendaryOption | undefined;
    for (const option of model.legendary.options)
      if (option.cost <= legendary && !(option.once && usedOnce.has(option.name)) && (!chosen || optionValue(option) > optionValue(chosen))) chosen = option;
    if (!chosen) return;
    legendary -= chosen.cost;
    if (chosen.once) usedOnce.add(chosen.name);
    if (chosen.kind === "attack") monsterAttack(chosen.attack);
    else monsterSave(chosen.save);
  };
  const weapon = (damage: number) => (model.weaponResistance ? Math.floor(damage / 2) : damage);
  const heroAttack = (toHit: number, dice: Dice[], isWeapon: boolean, advantage = false) => {
    let die = roll(random, 20);
    if (advantage) die = Math.max(die, roll(random, 20));
    if (die === 1 || (die !== 20 && die + toHit < model.ac)) return;
    const damage = rollDice(random, dice, die === 20);
    monster -= isWeapon ? weapon(damage) : damage;
  };
  const monsterSaves = (ability: keyof MonsterModel["saves"]) => {
    const one = () => roll(random, 20) + model.saves[ability];
    const result = model.magicResistance ? Math.max(one(), one()) : one();
    return result >= heroDc(level);
  };
  const heroTurn = (hero: Fighter, round: number) => {
    if (hero.down || monster <= 0) return;
    if (hero.kind === "guerriero") {
      const attacks = f.attacks * (f.surge && round === 1 ? 2 : 1);
      for (let i = 0; i < attacks && monster > 0; i++) heroAttack(f.toHit, f.damage, true);
    } else if (hero.kind === "chierico") {
      const fallen = heroes.find(other => other.down);
      if (fallen && heals > 0) { heals--; fallen.down = false; fallen.current = rollDice(random, [c.heal]); }
      if (c.aura) { const damage = rollDice(random, [c.aura]); monster -= monsterSaves("sag") ? Math.floor(damage / 2) : damage; }
      heroAttack(c.toHit, c.damage, true);
    } else if (hero.kind === "ladro") {
      heroAttack(r.toHit, r.damage, true, round % 2 === 1);
    } else {
      const index = slots.findIndex(left => left > 0);
      if (index < 0) heroAttack(w.cantrip.toHit, w.cantrip.damage, false);
      else {
        slots[index]--;
        const spell = w.spells[index];
        const damage = rollDice(random, [spell.dice]);
        if (!spell.ability) monster -= damage;
        else {
          let saved = monsterSaves(spell.ability);
          if (!saved && spell.legendaryResistance && resistances > 0) { resistances--; saved = true; }
          monster -= saved ? (spell.half ? Math.floor(damage / 2) : 0) : damage;
        }
      }
    }
  };

  // Random initiative: the monster and the four characters in a shuffled order.
  const order: (Fighter | "mostro")[] = [...heroes, "mostro"];
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  let round = 1;
  for (; round <= MAX_ROUNDS; round++) {
    for (const turn of order) {
      if (monster <= 0 || !standing().length) break;
      if (turn === "mostro") monsterTurn();
      else { heroTurn(turn, round); legendaryAction(); }
    }
    if (monster <= 0 || !standing().length) break;
  }
  const rounds = Math.min(round, MAX_ROUNDS);
  return { dealt, rounds, anyDown, wiped: !standing().length };
}

/** The averages of `fights` fights against 4 characters of the level of the CR, from a fixed seed. */
export function simulate(model: MonsterModel, fights = 3000, seed = SEED): BalanceMetrics {
  const random = seededRandom(seed);
  const level = levelOf(model.cr);
  let damage = 0, rounds = 0, down = 0, wiped = 0;
  for (let i = 0; i < fights; i++) {
    const result = fight(model, level, random);
    damage += result.dealt / result.rounds;
    rounds += result.rounds;
    if (result.anyDown) down++;
    if (result.wiped) wiped++;
  }
  const round1 = (value: number) => Math.round(value * 10) / 10;
  return { damagePerRound: round1(damage / fights), rounds: round1(rounds / fights), downPct: Math.round((down / fights) * 100), wipePct: Math.round((wiped / fights) * 100) };
}
