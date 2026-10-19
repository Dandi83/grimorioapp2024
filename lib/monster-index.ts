import "server-only";
import { unstable_cache } from "next/cache";
import { getAllMonsters } from "./monsters";
import { toMonsterListItem, type MonsterListItem } from "./monsters-types";

// Keep the complete existing catalog, including administrative and virtual rows.
// Admin saves invalidate the "monsters" tag; the hour is only a safety net.
export const getMonsterListIndex = unstable_cache(
  async (): Promise<MonsterListItem[]> => (await getAllMonsters()).map(toMonsterListItem),
  ["monster-list-index", process.env.VERCEL_ENV ?? "local"],
  { tags: ["monsters"], revalidate: 3600 },
);

// Only IDs are retained for build-time static generation.
export const getMonsterIdIndex = async (): Promise<{ id: string }[]> =>
  (await getMonsterListIndex()).map(({ id }) => ({ id }));
