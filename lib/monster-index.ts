import "server-only";
import { unstable_cache } from "next/cache";
import { getAllMonsters } from "./monsters";
import { homebrewListItem, publishedHomebrew } from "./homebrew";
import { toMonsterListItem, type MonsterListItem } from "./monsters-types";
import { previewMonsters, usesLegacyMonsterRules } from "./srd-monsters";
import habitats from "./data/habitat-mostri.json";
import editionLinks from "./data/monster-edition-links.json";
import animalIds from "./data/srd-animal-ids.json";
import { englishName } from "./english-names";

/**
 * Changes whenever the project files change what the list shows (new SRD sheets,
 * habitats, collections) or the rule that picks the habitat between the file and the admin. The cached list survives deployments, so without it new
 * sheets would appear only after the hourly refresh.
 */
/** The rule of resolveHabitats (lib/monster-habitats.ts) between the file and the admin choice. */
const HABITAT_RULE = "2026-10-24 elenco vuoto = non impostato";
/** The English names of the SRD creatures (PROMPT 33): a new list when they arrive. */
const ENGLISH_NAMES = "2026-10-31 nomi inglesi";

function projectCatalogVersion(): string {
  const listed = previewMonsters([], "production").map(({ id, nome, tipo, taglia, grado_sfida }) => [id, nome, tipo, taglia, grado_sfida]);
  const text = JSON.stringify([listed, habitats, HABITAT_RULE, editionLinks, animalIds, ENGLISH_NAMES]);
  let hash = 2166136261; // FNV-1a
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(36);
}

// Keep the complete existing catalog, including administrative and virtual rows.
// Admin saves invalidate the "monsters" tag; the hour is only a safety net.
// Homebrew creatures (lib/homebrew.ts) follow the SRD ones; before the first one the list is the SRD catalog alone.
export const getMonsterListIndex = unstable_cache(
  async (): Promise<MonsterListItem[]> => {
    const [monsters, homebrew] = await Promise.all([getAllMonsters(), publishedHomebrew()]);
    return [
      ...monsters.map(monster => {
        const edizione = usesLegacyMonsterRules(monster) ? "2014" : "2024";
        return toMonsterListItem({ ...monster, edizione, en: englishName("mostri", edizione, monster.id) });
      }),
      ...homebrew.map(homebrewListItem),
    ];
  },
  ["monster-list-index", process.env.VERCEL_ENV ?? "local", projectCatalogVersion()],
  { tags: ["monsters"], revalidate: 3600 },
);

// Only IDs are retained for build-time static generation.
export const getMonsterIdIndex = async (): Promise<{ id: string }[]> =>
  (await getMonsterListIndex()).map(({ id }) => ({ id }));
