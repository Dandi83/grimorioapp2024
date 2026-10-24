import { AdminEditorsView } from "@/components/admin-editors-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Amministrazione — Grimorio", robots: { index: false, follow: false } };

/** ?modifica=<id>: the editor of that creature (or the guided editor of a homebrew) at once (components/admin-editors-view.tsx). */
export default function AdminMonstersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <AdminEditorsView tab="monsters" searchParams={searchParams} />;
}
