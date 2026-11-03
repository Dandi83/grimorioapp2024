import { LateBoxes } from "@/components/home/late-boxes";
import { ShareCard } from "@/components/home/share-card";

/**
 * The question (when due) or the occasional support card, then the share card: always in the Home flow, never fixed
 * on the screen. support: the Ko-fi address is set (lib/support.ts).
 */
export function HomeExtras({ className, support }: { className?: string; support: boolean }) {
  return (
    <div className={className} data-home-extras="">
      <LateBoxes support={support} />
      <ShareCard />
    </div>
  );
}
