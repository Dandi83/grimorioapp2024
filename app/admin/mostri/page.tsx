import { isAdmin } from "@/lib/admin-auth";
import { getAdminSpells } from "@/lib/spells";
import { getAllMonsters } from "@/lib/monsters";
import { AdminLogin } from "@/components/admin-login";
import { AdminDashboard } from "@/components/admin-dashboard";
import { spellEdition } from "@/lib/admin-edition";
import { adminEdition } from "@/lib/admin-edition-server";
import { usesLegacyMonsterRules } from "@/lib/srd-monsters";

export const dynamic = "force-dynamic";
export const metadata = { title: "Amministrazione — Grimorio", robots: { index: false, follow: false } };

export default async function AdminEditorsPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  const [spells, monsters, edition] = await Promise.all([getAdminSpells(), getAllMonsters(), adminEdition()]);
  // Only the chosen edition (same rule as the public lists): no card changes, it is only a filter.
  return <AdminDashboard edition={edition} initialTab="monsters"
    spells={spells.filter(spell => spellEdition(spell) === edition)}
    monsters={monsters.filter(monster => (usesLegacyMonsterRules(monster) ? "2014" : "2024") === edition)} />;
}
