import { notFound, redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin-auth";
import { getAdminSpells } from "@/lib/spells";
import { getAllMonsters } from "@/lib/monsters";
import { AdminLogin } from "@/components/admin-login";
import { AdminCardEditor, type EditorCard } from "@/components/admin-card-editor";
import { spellEdition, type AdminEdition } from "@/lib/admin-edition";
import { adminEdition } from "@/lib/admin-edition-server";
import { safeReturnPath } from "@/lib/admin-edit-link";
import { usesLegacyMonsterRules } from "@/lib/srd-monsters";
import { hiddenCardPaths } from "@/lib/section-visibility";
import { publishedHomebrew } from "@/lib/homebrew";
import { publicLinksOut } from "@/lib/section-view";
import { CardDisplayProvider } from "@/components/card-display-context";
import { getSpellReferenceCatalog } from "@/lib/spell-reference-catalog";

type Params = Record<string, string | string[] | undefined>;

/**
 * /admin/incantesimi/<id> and /admin/mostri/<id>, opened by «Modifica» on the public card: only the editor
 * of that card, drawn by the server (never the list first). The admin area first moves to the card's
 * edition (/admin/edizione; a homebrew for both editions keeps the current one); ?ritorno=<path of the
 * site> is where saving or closing goes back to, the public card otherwise.
 */
export async function AdminCardEditorView({ kind, id, searchParams }: { kind: "incantesimo" | "mostro"; id: string; searchParams: Promise<Params> }) {
  if (!(await isAdmin())) return <AdminLogin />;
  const params = await searchParams;
  const ritorno = safeReturnPath(params.ritorno);
  const [chosen, hidden] = await Promise.all([adminEdition(), hiddenCardPaths().catch((): string[] => [])]);
  const publicPath = `${kind === "incantesimo" ? "/spell" : "/mostro"}/${id}`;
  let card: EditorCard;
  let wanted: AdminEdition | undefined;
  if (kind === "incantesimo") {
    const spell = (await getAdminSpells()).find(row => row.id === id);
    if (!spell) notFound();
    card = { kind, spell };
    wanted = spellEdition(spell);
  } else {
    const [monsters, homebrew] = await Promise.all([getAllMonsters(), publishedHomebrew().catch(() => [])]);
    const monster = monsters.find(row => row.id === id);
    const brew = monster ? undefined : homebrew.find(row => row.id === id);
    if (monster) {
      card = { kind, monster };
      wanted = usesLegacyMonsterRules(monster) ? "2014" : "2024";
    } else if (brew) {
      card = { kind: "homebrew", id, nome: brew.scheda.nome, draft: brew.scheda, ours: !brew.autore };
      if (brew.edizione !== "entrambe") wanted = brew.edizione;
    } else notFound();
  }
  if (wanted && wanted !== chosen && params.impostata !== "1") {
    const here = new URLSearchParams({ impostata: "1", ...(ritorno ? { ritorno } : {}) });
    redirect(`/admin/edizione?${new URLSearchParams({ valore: wanted, poi: `/admin/${kind === "incantesimo" ? "incantesimi" : "mostri"}/${encodeURIComponent(id)}?${here}` })}`);
  }
  // The preview of the editor links as the public card (lib/card-display.ts).
  const display = { catalog: await getSpellReferenceCatalog(), hidden: await publicLinksOut() };
  return (
    <CardDisplayProvider value={display}>
      <AdminCardEditor card={card} edition={wanted ?? chosen} back={ritorno ?? publicPath} hidden={hidden.includes(publicPath)} />
    </CardDisplayProvider>
  );
}
