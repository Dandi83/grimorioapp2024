import { unstable_cache } from "next/cache";

/**
 * PROMPT 55: the public pages stay static until an admin save refreshes them (no timed regeneration, few ISR writes).
 * A page built while the database could not be read shows the fallback values (all sections visible, no corrections,
 * empty lists): this call gives that one page a regeneration within a minute, so the fallback never stays.
 * A cached entry with a 60-second life lowers the revalidate time of the page being rendered (unstable_cache does it).
 */
const shortLived = unstable_cache(async () => true, ["isr-fallback"], { revalidate: 60 });

export async function shortLivedFallback(): Promise<void> {
  await shortLived().catch(() => undefined);
}
