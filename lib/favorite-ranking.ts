import type { FavoriteKind } from "./analytics-events";

/** A card of the catalog: its kind, its address id, the name shown and its edition. */
export type RankingCard = { kind: FavoriteKind; id: string; title: string; edition: "2014" | "2024"; href: string };
export type RankingRow = RankingCard & { people: number };
export type RankingFilter = { kind: FavoriteKind | "tutti"; edition: "2014" | "2024" | "tutte" };

export const RANKING_SIZE = 20;

/**
 * «I più salvati» (PROMPT 10): the counts per card (lib/analytics.ts, readFavoriteCounts) joined with the catalog,
 * filtered by kind and edition, most saved first (then by name), the first 20. A card no longer in the catalog is
 * left out; nothing with zero people.
 */
export function rankFavorites(counts: { kind: string; id: string; people: number }[], catalog: RankingCard[], filter: RankingFilter, size = RANKING_SIZE): RankingRow[] {
  const cards = new Map(catalog.map(card => [`${card.kind}:${card.id}`, card]));
  return counts
    .filter(row => row.people > 0)
    .map(row => { const card = cards.get(`${row.kind}:${row.id}`); return card ? { ...card, people: row.people } : undefined; })
    .filter((row): row is RankingRow => !!row && (filter.kind === "tutti" || row.kind === filter.kind) && (filter.edition === "tutte" || row.edition === filter.edition))
    .sort((a, b) => b.people - a.people || a.title.localeCompare(b.title, "it"))
    .slice(0, size);
}

/** The filters from the address of /admin/statistiche (anything unknown: all). */
export function rankingFilterOf(params: Record<string, string | string[] | undefined>): RankingFilter & { period: "30" | "sempre" } {
  const one = (key: string) => (Array.isArray(params[key]) ? params[key]![0] : params[key]) as string | undefined;
  const kind = one("salvati_tipo"), edition = one("salvati_edizione"), period = one("salvati_periodo");
  return {
    kind: kind === "incantesimo" || kind === "mostro" ? kind : "tutti",
    edition: edition === "2014" || edition === "2024" ? edition : "tutte",
    period: period === "30" ? "30" : "sempre",
  };
}
