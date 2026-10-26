import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin-auth";
import { getAdminSpells } from "@/lib/spells";
import { getAllMonsters } from "@/lib/monsters";
import { getSrdModifiedCards } from "@/lib/srd-modified-server";
import { AdminLogin } from "@/components/admin-login";
import { AdminDashboard } from "@/components/admin-dashboard";
import { spellEdition } from "@/lib/admin-edition";
import { adminEdition } from "@/lib/admin-edition-server";
import { safeReturnPath } from "@/lib/admin-edit-link";
import { usesLegacyMonsterRules } from "@/lib/srd-monsters";
import { hiddenCardPaths } from "@/lib/section-visibility";
import { homebrewMonster, publishedHomebrew } from "@/lib/homebrew";
import { publicLinksOut } from "@/lib/section-view";
import { CardDisplayProvider } from "@/components/card-display-context";
import { getSpellReferenceCatalog } from "@/lib/spell-reference-catalog";

type Params = Record<string, string | string[] | undefined>;

/**
 * /admin/incantesimi and /admin/mostri: the lists of spells and creatures, with their editors over them.
 * ?modifica=<id> (links made before the editor had its own page) goes on to /admin/incantesimi/<id> or
 * /admin/mostri/<id>, with ?ritorno.
 */
export async function AdminEditorsView({ tab, searchParams }: { tab: "spells" | "monsters"; searchParams: Promise<Params> }) {
  if (!(await isAdmin())) return <AdminLogin />;
  const params = await searchParams;
  if (typeof params.modifica === "string" && params.modifica) {
    const ritorno = safeReturnPath(params.ritorno);
    redirect(`/admin/${tab === "spells" ? "incantesimi" : "mostri"}/${encodeURIComponent(params.modifica)}${ritorno ? `?${new URLSearchParams({ ritorno })}` : ""}`);
  }
  const [spells, monsters, edition, hidden, homebrew, modified] = await Promise.all([getAdminSpells(), getAllMonsters(), adminEdition(), hiddenCardPaths().catch(() => []), publishedHomebrew().catch(() => []), getSrdModifiedCards()]);
  // After the lists (one more read, cached): the spells the previews link and the pages hidden from the public.
  const catalog = await getSpellReferenceCatalog();
  const out = await publicLinksOut();
  // Homebrew creatures of this edition («Entrambe» in both), with their plain draft for the guided editor.
  const homebrewHere = homebrew.filter(row => row.edizione === edition || row.edizione === "entrambe");
  // Cards hidden from the site with the eye (addresses), as ids of each list.
  const hiddenOf = (prefix: string) => hidden.filter(path => path.startsWith(prefix)).map(path => path.slice(prefix.length));
  // Only the chosen edition (same rule as the public lists): no card changes, it is only a filter.
  // The previews of the editors link as the public cards (lib/card-display.ts).
  return <CardDisplayProvider value={{ catalog, hidden: out }}><AdminDashboard edition={edition} hiddenSpells={hiddenOf("/spell/")} hiddenMonsters={hiddenOf("/mostro/")} initialTab={tab}
    modifiedSpells={modified.filter(card => card.kind === "incantesimo").map(card => card.id)}
    modifiedMonsters={modified.filter(card => card.kind === "mostro").map(card => card.id)}
    spells={spells.filter(spell => spellEdition(spell) === edition)}
    monsters={[...monsters.filter(monster => (usesLegacyMonsterRules(monster) ? "2014" : "2024") === edition), ...homebrewHere.map(homebrewMonster)]}
    homebrewDrafts={Object.fromEntries(homebrewHere.map(row => [row.id, row.scheda]))} /></CardDisplayProvider>;
}
