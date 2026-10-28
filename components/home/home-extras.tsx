import { RatingBox } from "@/components/home/rating-box";
import { ShareCard } from "@/components/home/share-card";

/** The question (when due) above the share card, always in the Home flow, never fixed on the screen. */
export function HomeExtras({ className }: { className?: string }) {
  return (
    <div className={className} data-home-extras="">
      <RatingBox />
      <ShareCard />
    </div>
  );
}
