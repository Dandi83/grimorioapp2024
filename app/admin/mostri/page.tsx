import { AdminEditorsView } from "@/components/admin-editors-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Amministrazione — Grimorio", robots: { index: false, follow: false } };

/** The creatures of the admin area; ?modifica=<id> (older links) goes on to /admin/mostri/<id> (components/admin-editors-view.tsx). */
export default function AdminMonstersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <AdminEditorsView tab="monsters" searchParams={searchParams} />;
}
