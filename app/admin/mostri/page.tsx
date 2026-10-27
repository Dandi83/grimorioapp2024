import { AdminListPage } from "@/components/admin-list/admin-list-page";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mostri — Il Grimorio.App", robots: { index: false, follow: false } };

/** The creatures of the admin area; ?modifica=<id> (older links) goes on to /admin/mostri/<id> (components/admin-list/admin-list-page.tsx). */
export default function AdminMonstersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <AdminListPage tab="monsters" searchParams={searchParams} />;
}
