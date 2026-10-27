import "server-only";
import { countNewFeedback, countOpenRightsRequests } from "./feedback";
import { countProposalsToReview } from "./homebrew";
import { getReviewNameCards } from "./review-names-server";
import { getSrdModifiedCards } from "./srd-modified-server";

/**
 * «Da fare» of the Home of the reserved area: one line per check, shown only while it has at least one item.
 * To add a check, add one entry here: the Home and the side menu read this list and nothing else.
 */
export interface AdminCheck {
  key: string;
  /** How many items wait; a check that cannot be read counts as 0 (it hides, the Home still opens). */
  count: () => Promise<number>;
  /** The line, with the number: «Controlla 18 schede SRD modificate». */
  label: (count: number) => string;
  href: string;
  /** Red instead of amber: the rights requests. */
  urgent?: boolean;
}

const many = (count: number, one: string, more: string) => `${count} ${count === 1 ? one : more}`;

export const ADMIN_CHECKS: readonly AdminCheck[] = [
  { key: "diritti", count: countOpenRightsRequests, label: n => `Gestisci ${many(n, "richiesta", "richieste")} per diritti d’autore o marchi`, href: "/admin/notifiche?tipo=segnalazioni", urgent: true },
  { key: "segnalazioni", count: countNewFeedback, label: n => `Leggi ${many(n, "segnalazione nuova", "segnalazioni nuove")}`, href: "/admin/notifiche?tipo=segnalazioni" },
  { key: "proposte", count: countProposalsToReview, label: n => `Valuta ${many(n, "proposta homebrew", "proposte homebrew")}`, href: "/admin/notifiche?tipo=proposte" },
  { key: "srd-modificate", count: () => getSrdModifiedCards().then(cards => cards.length), label: n => `Controlla ${many(n, "scheda SRD modificata", "schede SRD modificate")}`, href: "/admin/srd-modificate" },
  { key: "nomi-da-rivedere", count: () => getReviewNameCards().then(cards => cards.length), label: n => `Rivedi ${many(n, "nome a rischio", "nomi a rischio")}`, href: "/admin/nomi-da-rivedere" },
];

export interface DueCheck { key: string; text: string; href: string; count: number; urgent: boolean }

/** The checks with at least one item, in the order of the list. */
export async function dueChecks(checks: readonly AdminCheck[] = ADMIN_CHECKS): Promise<DueCheck[]> {
  const counts = await Promise.all(checks.map(check => check.count().catch(() => 0)));
  return checks.flatMap((check, index) => counts[index] > 0
    ? [{ key: check.key, text: check.label(counts[index]), href: check.href, count: counts[index], urgent: !!check.urgent }] : []);
}
