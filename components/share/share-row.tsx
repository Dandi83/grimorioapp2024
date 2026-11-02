import { ShareButton } from "@/components/share-button";
import type { ShareCard } from "@/lib/share-card";

/** «Condividi» at the top right of an edition panel (PROMPT 50): the link of the edition shown and its card. */
export function ShareRow({ path, title, card }: { path: string; title: string; card: ShareCard }) {
  return (
    <div className="-mb-3 flex justify-end" data-share-row="">
      <ShareButton inline path={path} title={title} card={card} />
    </div>
  );
}
