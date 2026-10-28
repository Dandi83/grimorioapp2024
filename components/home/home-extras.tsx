import { RatingBox } from "@/components/home/rating-box";
import { ShareCard } from "@/components/home/share-card";
import { SupportCard } from "@/components/support/support-card";

/**
 * The question (when due) or the occasional support card, then the share card: always in the Home flow, never fixed
 * on the screen. support: the Ko-fi address is set (lib/support.ts).
 */
export function HomeExtras({ className, support }: { className?: string; support: boolean }) {
  return (
    <div className={className} data-home-extras="">
      <RatingBox />
      <SupportCard enabled={support} />
      <ShareCard />
    </div>
  );
}
