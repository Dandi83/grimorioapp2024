import type { Monster } from "@/lib/monsters-types";
import { MonsterSheetBody, MonsterSheetTitle } from "./monster-sheet";
import { CardOriginBox } from "./card-origin-box";
import { MonsterProvenanceBadge } from "./monster-provenance-badge";
import { useCardDisplay } from "./card-display-context";

/** The editor preview uses the same sheet as the public page, with the same links (catalog of the page). */
export function AdminMonsterPreview({
  monster,
  legacy,
}: {
  monster: Partial<Monster>;
  legacy: boolean;
}) {
  const edition = monster.edizione ?? (legacy ? "2014" : undefined);
  const display = useCardDisplay();
  return (
    <article className="monster-sheet min-w-0 rounded-xl border border-primary/20 bg-background py-5">
      <MonsterSheetTitle
        monster={monster}
        before={
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
            Anteprima · non ancora salvata
          </p>
        }
        label={edition ? <MonsterProvenanceBadge edition={edition} variant="dark" /> : undefined}
      />
      <MonsterSheetBody monster={monster} legacy={legacy} catalog={display.catalog} hidden={display.hidden} />
      <CardOriginBox source={monster.fonte_scheda} className="mx-6 mt-6" />
    </article>
  );
}
