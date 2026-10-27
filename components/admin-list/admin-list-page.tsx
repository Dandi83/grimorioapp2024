import { redirect } from "next/navigation";

import { AdminList } from "@/components/admin-list/admin-list";
import { AdminLogin } from "@/components/admin-login";
import { CardDisplayProvider } from "@/components/card-display-context";
import { safeReturnPath } from "@/lib/admin-edit-link";
import { isAdmin } from "@/lib/admin-auth";
import { adminEdition } from "@/lib/admin-edition-server";
import { monsterList, spellList } from "@/lib/admin-lists";
import { publicLinksOut } from "@/lib/section-view";
import { getSpellReferenceCatalog } from "@/lib/spell-reference-catalog";

type Params = Record<string, string | string[] | undefined>;

/**
 * /admin/incantesimi and /admin/mostri: the list of the chosen edition (components/admin-list/admin-list.tsx); the editor
 * of a card is its own page. ?modifica=<id> (links made before) goes on to that page, with ?ritorno.
 */
export async function AdminListPage({ tab, searchParams }: { tab: "spells" | "monsters"; searchParams: Promise<Params> }) {
  if (!(await isAdmin())) return <AdminLogin />;
  const params = await searchParams;
  if (typeof params.modifica === "string" && params.modifica) {
    const ritorno = safeReturnPath(params.ritorno);
    redirect(`/admin/${tab === "spells" ? "incantesimi" : "mostri"}/${encodeURIComponent(params.modifica)}${ritorno ? `?${new URLSearchParams({ ritorno })}` : ""}`);
  }
  const edition = await adminEdition();
  const [data, catalog, out] = await Promise.all([tab === "spells" ? spellList(edition) : monsterList(edition), getSpellReferenceCatalog(), publicLinksOut()]);
  // The previews of the editors opened by «+» link as the public cards (lib/card-display.ts).
  return <CardDisplayProvider value={{ catalog, hidden: out }}><AdminList data={data} create={tab === "spells" ? "spell" : "monster"} /></CardDisplayProvider>;
}
