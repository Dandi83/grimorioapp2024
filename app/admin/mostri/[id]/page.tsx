import { AdminCardEditorView } from "@/components/admin-card-editor-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Modifica creatura — Il Grimorio.App", robots: { index: false, follow: false } };

/** Only the editor of one creature or homebrew, from «Modifica» on its public card (components/admin-card-editor-view.tsx). */
export default async function AdminMonsterEditPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  return <AdminCardEditorView kind="mostro" id={id} searchParams={searchParams} />;
}
