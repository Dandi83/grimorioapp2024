import { isAdmin } from "@/lib/admin-auth";
import { getAllSpells } from "@/lib/spells";
import { getAllMonsters } from "@/lib/monsters";
import { AdminLogin } from "@/components/admin-login";
import { AdminDashboard } from "@/components/admin-dashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Amministrazione — Grimorio", robots: { index: false, follow: false } };

export default async function AdminEditorsPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  const [spells, monsters] = await Promise.all([getAllSpells({ includePreview: false }), getAllMonsters()]);
  return <AdminDashboard spells={spells} monsters={monsters} initialTab="monsters" />;
}
