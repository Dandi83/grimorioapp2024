import "server-only";
import { countNewFeedback } from "./feedback";
import { countProposalsToReview } from "./homebrew";

/** The number on the app icon of the administrator: new reports and homebrew proposals still to review. */
export async function adminBadgeCount(): Promise<number> {
  const [reports, proposals] = await Promise.all([countNewFeedback(), countProposalsToReview().catch(() => 0)]);
  return reports + proposals;
}
