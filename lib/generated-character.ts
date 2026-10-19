import { normalizeCharacter, type Character } from "./characters";
/** Produce a reviewable view from the supplied values; no invented rules or AI generation. */
export function generateCharacterSheet(character: Character): Character {
  return structuredClone(normalizeCharacter(character));
}
