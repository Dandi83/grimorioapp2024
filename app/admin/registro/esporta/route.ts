import { isAdmin } from "@/lib/admin-auth";
import { allOverrides } from "@/lib/content-overrides";

export const dynamic = "force-dynamic";

/** «Esporta correzioni»: the whole log as a JSON file, as a backup. Admin only. */
export async function GET() {
  if (!(await isAdmin())) return new Response("Non autorizzato", { status: 401, headers: { "Cache-Control": "no-store" } });
  const rows = await allOverrides();
  const day = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify({ esportato_il: new Date().toISOString(), versione: 1, correzioni: rows }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="grimorio-correzioni-${day}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
