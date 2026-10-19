import "server-only";
import { unstable_cache } from "next/cache";
import { getAllMonsters } from "./monsters";

// Keep the complete existing catalog, including administrative and virtual rows.
// Only IDs are retained for build-time static generation.
export const getMonsterIdIndex = unstable_cache(
  async (): Promise<{ id: string }[]> => (await getAllMonsters()).map(({ id }) => ({ id })),
  ["monster-id-index", process.env.VERCEL_ENV ?? "local"],
  { tags: ["monsters"], revalidate: 3600 },
);
