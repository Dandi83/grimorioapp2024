import { AdminLogin } from "@/components/admin-login";
import { MonsterImport } from "@/components/homebrew/monster-import";
import { isAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Importa mostro — Il Grimorio.App", robots: { index: false, follow: false } };

/** «Importa mostro» (PROMPT 44): a creature «Dalla redazione» from one JSON block, checked, previewed, saved hidden. */
export default async function ImportMonsterPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  return <MonsterImport />;
}
