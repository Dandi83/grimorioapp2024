import { isAdmin } from "@/lib/admin-auth";
import { getAllSpells } from "@/lib/spells";
import { getAllMonsters } from "@/lib/monsters";
import { AdminLogin } from "@/components/admin-login";
import { AdminDashboard } from "@/components/admin-dashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Amministrazione — Grimorio",
};

export default async function AdminPage() {
  const authed = await isAdmin();

  if (!authed) {
    return <AdminLogin />;
  }

  const [spells, monsters] = await Promise.all([getAllSpells(), getAllMonsters()]);
  return <AdminDashboard spells={spells} monsters={monsters} />;
}
