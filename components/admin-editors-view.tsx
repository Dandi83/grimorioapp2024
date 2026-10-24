import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin-auth";
import { getAdminSpells } from "@/lib/spells";
import { getAllMonsters } from "@/lib/monsters";
import { AdminLogin } from "@/components/admin-login";
import { AdminDashboard } from "@/components/admin-dashboard";
import { spellEdition, type AdminEdition } from "@/lib/admin-edition";
import { adminEdition } from "@/lib/admin-edition-server";
import { safeReturnPath } from "@/lib/admin-edit-link";
import { usesLegacyMonsterRules } from "@/lib/srd-monsters";
import { hiddenCardPaths } from "@/lib/section-visibility";
import { homebrewMonster, publishedHomebrew } from "@/lib/homebrew";

type Params = Record<string, string | string[] | undefined>;

/**
 * /admin/incantesimi and /admin/mostri: the editors of spells and creatures. ?modifica=<id> opens the
 * editor of that card at once («Modifica» on its public page), first putting the admin area on the
 * card's edition (/admin/edizione); ?ritorno=<path of the site> is where saving or closing goes back to.
 */
export async function AdminEditorsView({ tab, searchParams }: { tab: "spells" | "monsters"; searchParams: Promise<Params> }) {
  if (!(await isAdmin())) return <AdminLogin />;
  const params = await searchParams;
  const [spells, monsters, chosen, hidden, homebrew] = await Promise.all([getAdminSpells(), getAllMonsters(), adminEdition(), hiddenCardPaths().catch(() => []), publishedHomebrew().catch(() => [])]);
  const modifica = typeof params.modifica === "string" ? params.modifica : undefined;
  const ritorno = safeReturnPath(params.ritorno);
  // The edition of the card to open: the admin area moves to it (a homebrew for both editions keeps the current one).
  let wanted: AdminEdition | undefined;
  if (modifica && tab === "spells") {
    const spell = spells.find(row => row.id === modifica);
    if (spell) wanted = spellEdition(spell);
  } else if (modifica) {
    const monster = monsters.find(row => row.id === modifica);
    const brew = homebrew.find(row => row.id === modifica);
    if (monster) wanted = usesLegacyMonsterRules(monster) ? "2014" : "2024";
    else if (brew && brew.edizione !== "entrambe") wanted = brew.edizione;
  }
  if (wanted && wanted !== chosen && params.impostata !== "1") {
    const here = new URLSearchParams({ modifica: modifica!, impostata: "1", ...(ritorno ? { ritorno } : {}) });
    redirect(`/admin/edizione?${new URLSearchParams({ valore: wanted, poi: `/admin/${tab === "spells" ? "incantesimi" : "mostri"}?${here}` })}`);
  }
  const edition = wanted ?? chosen;
  // Homebrew creatures of this edition («Entrambe» in both), with their plain draft for the guided editor.
  const homebrewHere = homebrew.filter(row => row.edizione === edition || row.edizione === "entrambe");
  // Cards hidden from the site with the eye (addresses), as ids of each list.
  const hiddenOf = (prefix: string) => hidden.filter(path => path.startsWith(prefix)).map(path => path.slice(prefix.length));
  // Only the chosen edition (same rule as the public lists): no card changes, it is only a filter.
  return <AdminDashboard edition={edition} hiddenSpells={hiddenOf("/spell/")} hiddenMonsters={hiddenOf("/mostro/")} initialTab={tab}
    spells={spells.filter(spell => spellEdition(spell) === edition)}
    monsters={[...monsters.filter(monster => (usesLegacyMonsterRules(monster) ? "2014" : "2024") === edition), ...homebrewHere.map(homebrewMonster)]}
    homebrewDrafts={Object.fromEntries(homebrewHere.map(row => [row.id, row.scheda]))}
    open={modifica} returnTo={ritorno} />;
}
