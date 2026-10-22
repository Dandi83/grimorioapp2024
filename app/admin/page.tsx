import { isAdmin } from "@/lib/admin-auth";
import { getAllSpells } from "@/lib/spells";
import { getAllMonsters } from "@/lib/monsters";
import { countNewFeedback } from "@/lib/feedback";
import { AdminLogin } from "@/components/admin-login";
import { AdminDashboard } from "@/components/admin-dashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Amministrazione — Grimorio",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const authed = await isAdmin();

  if (!authed) {
    return <AdminLogin />;
  }

  const [spells, monsters, newReports] = await Promise.all([
    getAllSpells({ includePreview: false }),
    getAllMonsters(),
    countNewFeedback().catch(() => null),
  ]);
  return <AdminDashboard spells={spells} monsters={monsters} newReports={newReports} />;
}
