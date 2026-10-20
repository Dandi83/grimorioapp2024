import type { Monster } from "@/lib/monsters-types";
import { MonsterSheetBody, MonsterSheetTitle } from "./monster-sheet";
import { MonsterProvenanceBadge } from "./monster-provenance-badge";

/** The editor preview uses the same sheet as the public page. */
export function AdminMonsterPreview({
  monster,
  legacy,
}: {
  monster: Partial<Monster>;
  legacy: boolean;
}) {
  const edition = monster.edizione ?? (legacy ? "2014" : undefined);
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
      <MonsterSheetBody monster={monster} legacy={legacy} />
    </article>
  );
}
