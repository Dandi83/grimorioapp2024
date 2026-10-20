import links from "./data/monster-edition-links.json";

// Pure helpers, safe on client and server.

export const HABITATS = [
  "Artico", "Collina", "Costa", "Deserto", "Foresta", "Montagna", "Palude",
  "Prateria", "Sottomarino", "Sottosuolo", "Urbano", "Planare", "Qualsiasi",
] as const;
export type Habitat = (typeof HABITATS)[number];

const editionLinks: Record<string, { id2024: string }> = links.links;

/** Only known habitats, each once, in the fixed order of the list. */
export function normalizeHabitats(values: readonly unknown[]): Habitat[] {
  return HABITATS.filter(habitat => values.includes(habitat));
}

/** The two editions of the same creature share one habitat, stored under the 2024 sheet. */
export function habitatKey(id: string): string {
  return editionLinks[id]?.id2024 ?? id;
}

/** undefined: an older form without the field, so the saved habitat is kept. */
export function habitatsFromForm(form: FormData): Habitat[] | undefined {
  if (!form.has("habitat_present")) return undefined;
  return normalizeHabitats(form.getAll("habitat"));
}

/** A creature living in at least one chosen habitat; "Qualsiasi" lives everywhere. */
export function matchesHabitats(habitats: readonly string[] | undefined, selected: readonly string[]): boolean {
  if (!selected.length) return true;
  if (!habitats?.length) return false;
  return habitats.includes("Qualsiasi") || habitats.some(habitat => selected.includes(habitat));
}
