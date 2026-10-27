import { AdminListPage } from "@/components/admin-list/admin-list-page";

export const dynamic = "force-dynamic";
export const metadata = { title: "Incantesimi — Il Grimorio.App", robots: { index: false, follow: false } };

/** The spells of the admin area; ?modifica=<id> (older links) goes on to /admin/incantesimi/<id> (components/admin-list/admin-list-page.tsx). */
export default function AdminSpellsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <AdminListPage tab="spells" searchParams={searchParams} />;
}
