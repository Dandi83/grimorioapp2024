import "server-only";

import { readNow, readStatistics } from "./analytics";
import { periodRange, share } from "./analytics-stats";

/** The numbers of the strip on the Home (PROMPT 18): the tiles of /admin/statistiche on the last 30 days, and «adesso». */
export type AdminSummary = { adesso: number; persone: number; tornano: number; app: number };

export async function readAdminSummary(): Promise<AdminSummary> {
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());
  const [data, adesso] = await Promise.all([readStatistics(periodRange("30", today)), readNow()]);
  return { adesso, persone: data.people, tornano: share(data.returning, data.people), app: data.installed };
}
