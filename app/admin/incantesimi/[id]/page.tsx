import { AdminCardEditorView } from "@/components/admin-card-editor-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Modifica incantesimo — Il Grimorio.App", robots: { index: false, follow: false } };

/** Only the editor of one spell, from «Modifica» on its public card (components/admin-card-editor-view.tsx). */
export default async function AdminSpellEditPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  return <AdminCardEditorView kind="incantesimo" id={id} searchParams={searchParams} />;
}
