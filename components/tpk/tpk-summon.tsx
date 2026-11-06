import { HiddenPartBar } from "@/components/sections/part-block";
import { TpkSummonButton } from "@/components/tpk/tpk-summon-button";
import { partId } from "@/lib/public-sections";
import { partState } from "@/lib/section-view";
import { TPK_SUMMON_PART } from "@/lib/tpk-summon";

/**
 * PROMPT 69: the box at the bottom of a 2024 creature (lib/tpk-summon.ts tpkSummonApplies), after its last block and
 * before the source. While the part «Affrontalo in TPK» is hidden (from the start) or «In arrivo», the public gets
 * nothing of it, not even in the HTML; the administrator sees it with «Nascosta» and «Mostra» above.
 */
export async function TpkSummon({ id }: { id: string }) {
  const state = await partState("bestiario", TPK_SUMMON_PART);
  if (!state.shown) return null;
  const part = partId("bestiario", TPK_SUMMON_PART);
  return (
    <div data-part={part} className="mx-6 mb-8 space-y-1">
      {state.hidden && <HiddenPartBar id={part} />}
      <TpkSummonButton id={id} />
    </div>
  );
}
