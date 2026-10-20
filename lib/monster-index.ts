import "server-only";
import { unstable_cache } from "next/cache";
import { getAllMonsters } from "./monsters";
import { toMonsterListItem, type MonsterListItem } from "./monsters-types";
import { previewMonsters, usesLegacyMonsterRules } from "./srd-monsters";
import habitats from "./data/habitat-mostri.json";
import editionLinks from "./data/monster-edition-links.json";
import animalIds from "./data/srd-animal-ids.json";

/**
 * Changes whenever the project files change what the list shows (new SRD sheets,
 * habitats, collections). The cached list survives deployments, so without it new
 * sheets would appear only after the hourly refresh.
 */
function projectCatalogVersion(): string {
  const listed = previewMonsters([], "production").map(({ id, nome, tipo, taglia, grado_sfida }) => [id, nome, tipo, taglia, grado_sfida]);
  const text = JSON.stringify([listed, habitats, editionLinks, animalIds]);
  let hash = 2166136261; // FNV-1a
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(36);
}

// Keep the complete existing catalog, including administrative and virtual rows.
// Admin saves invalidate the "monsters" tag; the hour is only a safety net.
export const getMonsterListIndex = unstable_cache(
  async (): Promise<MonsterListItem[]> => (await getAllMonsters()).map(monster =>
    toMonsterListItem({ ...monster, edizione: usesLegacyMonsterRules(monster) ? "2014" : "2024" })),
  ["monster-list-index", process.env.VERCEL_ENV ?? "local", projectCatalogVersion()],
  { tags: ["monsters"], revalidate: 3600 },
);

// Only IDs are retained for build-time static generation.
export const getMonsterIdIndex = async (): Promise<{ id: string }[]> =>
  (await getMonsterListIndex()).map(({ id }) => ({ id }));
