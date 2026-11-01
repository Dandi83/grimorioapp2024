import type { Attack, Dice, LegendaryOption, MonsterModel, SaveAbility } from "./parse";
import { BASE_PARTY, cleric, fighter, heroDc, levelOf, party, rogue, wizard, type Hero, type HeroKind } from "./party";
import { roll, seededRandom, type Random } from "./random";

/** The averages of many fights against a group of characters. */
export type BalanceMetrics = {
  /** Damage really taken from the characters (never beyond 0) per round. */
  damagePerRound: number;
  /** Rounds the monster lasts (15 at most). */
  rounds: number;
  /** Fights with at least one character at 0 hit points, in %. */
  downPct: number;
  /** Fights with the whole group at 0, in %. */
  wipePct: number;
  /** Fights the characters win (the monster at 0), in %. */
  winPct: number;
  /** Fights where a character goes from full hit points to 0 in one turn of the monster (its legendary actions of the round included), in %. */
  oneShotPct: number;
};

export const MAX_ROUNDS = 15;
export const SEED = 20261029;

/**
 * How the master plays the monster (PROMPT 19, the 2024 method: a monster stays of its CR whatever the master chooses).
 * «ottimale»: the action with the most expected damage; «caso»: one of the available actions at random; «prudente»:
 * the multiattack first, an ability that recharges only one time out of two when it is ready. Legendary actions:
 * the best one, or one at random among those it can pay.
 */
export type Tactic = "ottimale" | "caso" | "prudente";
export const TACTICS: Tactic[] = ["ottimale", "caso", "prudente"];

/** A group and a level for the fights: the reference one (4 characters, level = CR), or a test situation. */
export type FightSetup = { tactic?: Tactic; kinds?: HeroKind[]; levelShift?: number };

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

type Fighter = Hero & {
  current: number; down: boolean;
  /** Wizard: spell slots and Shield; cleric: the fallen it can raise; each character with its own. */
  slots: number[]; shields: number; heals: number;
};

/** The level of the characters for a CR, moved by the test situation (1 to 20). */
export const levelFor = (cr: number, shift = 0) => Math.min(20, Math.max(1, levelOf(cr) + shift));

/** One fight; returns the damage taken from the characters, the rounds, who fell and who won. */
function fight(model: MonsterModel, level: number, kinds: HeroKind[], tactic: Tactic, random: Random) {
  const f = fighter(level), c = cleric(level), r = rogue(level), w = wizard(level);
  const heroes: Fighter[] = party(level, kinds).map(hero => ({
    ...hero, current: hero.hp, down: false,
    slots: hero.kind === "mago" ? w.spells.map(spell => spell.slots) : [], shields: hero.kind === "mago" ? w.shields : 0,
    heals: hero.kind === "chierico" ? c.heals : 0,
  }));
  // PROMPT 46: an attack with «Ricarica» or «N/giorno» is never the one the multiattack repeats.
  const isLimited = (attack: Attack) => !!(attack.recharge || attack.perDay);
  const best = model.attacks.filter(attack => !isLimited(attack))
    .reduce<Attack | undefined>((top, attack) => (!top || attack.average > top.average ? attack : top), undefined);
  const limited = model.attacks.filter(isLimited);
  const limitedReady = limited.map(() => true);
  const limitedUses = limited.map(attack => attack.perDay ?? Infinity);
  const canUse = (k: number) => limitedReady[k] && limitedUses[k] > 0;
  // Its turn alone (it is not in the multiattack), or the multiattack without the usual attacks.
  const alone = limited.map((attack, k) => k).filter(k => !limited[k].inMultiattack || !best);
  const multiValue = best ? attackValue(best, model.multiattack) : 0;
  const ready = model.abilities.map(() => true);
  const usesLeft = model.abilities.map(ability => ability.perDay ?? Infinity);
  let resistances = model.legendaryResistance;
  let monster = model.hp, dealt = 0, anyDown = false, oneShot = false;
  let legendary = model.legendary.uses;
  let usedOnce = new Set<string>();
  // The characters at full hit points when the monster's turn starts: one at 0 before its next turn fell «in un colpo solo».
  let fullAtTurn = new Set<Fighter>();

  const standing = () => heroes.filter(hero => !hero.down);
  const pick = () => { const up = standing(); return up[Math.floor(random() * up.length)]; };
  const hurt = (hero: Fighter, damage: number) => {
    const taken = Math.min(hero.current, damage);
    hero.current -= taken; dealt += taken;
    if (hero.current <= 0) {
      hero.down = true; anyDown = true;
      if (fullAtTurn.has(hero)) oneShot = true;
    }
  };
  const monsterAttack = (attack: Attack) => {
    const target = pick();
    if (!target) return;
    const die = roll(random, 20);
    if (die === 1) return;
    const total = die + attack.bonus;
    if (die !== 20 && total < target.ac) return;
    // The wizard's Shield: +5 AC against a hit it can turn into a miss.
    if (die !== 20 && target.kind === "mago" && target.shields > 0 && total < target.ac + 5) { target.shields--; return; }
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
  const castAbility = (index: number) => {
    const ability = model.abilities[index];
    if (ability.recharge) ready[index] = false;
    usesLeft[index]--;
    monsterSave(ability);
  };
  const spendLimited = (k: number) => {
    if (limited[k].recharge) limitedReady[k] = false;
    limitedUses[k]--;
    monsterAttack(limited[k]);
  };
  const multiattack = () => {
    if (!best) return;
    let times = model.multiattack;
    // «Può sostituire uno di questi attacchi con …, se è disponibile»: once, when ready.
    const swap = limited.map((_, k) => k).filter(k => limited[k].inMultiattack && canUse(k))
      .sort((a, b) => limited[b].average - limited[a].average)[0];
    if (swap !== undefined && limited[swap].average > best.average) { spendLimited(swap); times--; }
    for (let i = 0; i < times; i++) monsterAttack(best);
  };
  const monsterTurn = () => {
    // Regeneration: at the start of its turn, only while it still has hit points, never beyond its maximum.
    if (model.regeneration && monster > 0) monster = Math.min(model.hp, monster + model.regeneration);
    legendary = model.legendary.uses;
    usedOnce = new Set();
    fullAtTurn = new Set(heroes.filter(hero => !hero.down && hero.current >= hero.hp));
    model.abilities.forEach((ability, i) => { if (!ready[i] && ability.recharge && roll(random, 6) >= ability.recharge) ready[i] = true; });
    limited.forEach((attack, k) => { if (!limitedReady[k] && attack.recharge && roll(random, 6) >= attack.recharge) limitedReady[k] = true; });
    const available = model.abilities.map((_, i) => i).filter(i => ready[i] && usesLeft[i] > 0);
    const aloneReady = alone.filter(canUse).sort((a, b) => limited[b].average - limited[a].average);
    if (tactic === "caso") {
      // One of the available actions at random: the multiattack or an ability with its saving throw ready.
      const choices = [...(best ? [-1] : []), ...available, ...aloneReady.map(k => -2 - k)];
      if (!choices.length) return;
      const choice = choices[Math.floor(random() * choices.length)];
      if (choice === -1) multiattack(); else if (choice < -1) spendLimited(-2 - choice); else castAbility(choice);
      return;
    }
    let chosen = -1, value = 0;
    for (const i of available) if (saveValue(model.abilities[i]) > value) { chosen = i; value = saveValue(model.abilities[i]); }
    if (tactic === "prudente") {
      // The multiattack first; an ability that recharges one time out of two when ready; without attacks, the best ability.
      if (!best) { if (chosen >= 0) castAbility(chosen); else if (aloneReady.length) spendLimited(aloneReady[0]); return; }
      const recharging = available.filter(i => model.abilities[i].recharge).sort((a, b) => saveValue(model.abilities[b]) - saveValue(model.abilities[a]));
      if (recharging.length && random() < 0.5) castAbility(recharging[0]);
      else if (aloneReady.length && limited[aloneReady[0]].recharge && random() < 0.5) spendLimited(aloneReady[0]);
      else multiattack();
      return;
    }
    const aloneValue = aloneReady.length ? attackValue(limited[aloneReady[0]]) : 0;
    if (aloneReady.length && aloneValue > value && (aloneValue > multiValue || !best)) spendLimited(aloneReady[0]);
    else if (chosen >= 0 && (value >= 0.8 * multiValue || !best)) castAbility(chosen);
    else multiattack();
  };
  const legendaryAction = () => {
    if (monster <= 0 || legendary <= 0 || !standing().length) return;
    const payable = model.legendary.options.filter(option => option.cost <= legendary && !(option.once && usedOnce.has(option.name)));
    if (!payable.length) return;
    const chosen = tactic === "ottimale"
      ? payable.reduce((top, option) => (optionValue(option) > optionValue(top) ? option : top))
      : payable[Math.floor(random() * payable.length)];
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
      if (fallen && hero.heals > 0) { hero.heals--; fallen.down = false; fallen.current = rollDice(random, [c.heal]); }
      if (c.aura) { const damage = rollDice(random, [c.aura]); monster -= monsterSaves("sag") ? Math.floor(damage / 2) : damage; }
      heroAttack(c.toHit, c.damage, true);
    } else if (hero.kind === "ladro") {
      heroAttack(r.toHit, r.damage, true, round % 2 === 1);
    } else {
      const index = hero.slots.findIndex(left => left > 0);
      if (index < 0) heroAttack(w.cantrip.toHit, w.cantrip.damage, false);
      else {
        hero.slots[index]--;
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

  // Random initiative: the monster and the characters in a shuffled order.
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
  return { dealt, rounds, anyDown, wiped: !standing().length, won: monster <= 0, oneShot };
}

/**
 * The averages of `fights` fights from a fixed seed: by default 4 characters of the level of the CR and the master
 * «ottimale»; `setup` changes the tactic, the group or the level (the test situations).
 */
export function simulate(model: MonsterModel, fights = 3000, seed = SEED, setup: FightSetup = {}): BalanceMetrics {
  const random = seededRandom(seed);
  const level = levelFor(model.cr, setup.levelShift);
  const kinds = setup.kinds ?? BASE_PARTY, tactic = setup.tactic ?? "ottimale";
  let damage = 0, rounds = 0, down = 0, wiped = 0, won = 0, oneShot = 0;
  for (let i = 0; i < fights; i++) {
    const result = fight(model, level, kinds, tactic, random);
    damage += result.dealt / result.rounds;
    rounds += result.rounds;
    if (result.anyDown) down++;
    if (result.wiped) wiped++;
    if (result.won) won++;
    if (result.oneShot) oneShot++;
  }
  const round1 = (value: number) => Math.round(value * 10) / 10;
  const pct = (count: number) => Math.round((count / fights) * 100);
  return { damagePerRound: round1(damage / fights), rounds: round1(rounds / fights), downPct: pct(down), wipePct: pct(wiped), winPct: pct(won), oneShotPct: pct(oneShot) };
}
