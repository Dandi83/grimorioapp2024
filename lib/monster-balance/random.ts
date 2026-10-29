/** A small seeded generator (mulberry32): the same seed gives the same fights, so the results can be repeated. */
export type Random = () => number;

export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A die from 1 to sides. */
export const roll = (random: Random, sides: number) => 1 + Math.floor(random() * sides);
