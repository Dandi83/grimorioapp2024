import { notFound } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { MagicItemSheet } from "@/components/magic-items/magic-item-sheet";
import { findMagicItem, magicItems } from "@/lib/magic-items";

export const dynamicParams = false;

const LIST = "/oggetti-magici";

export function generateStaticParams() {
  return magicItems["2024"].map(item => ({ id: item.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const item = findMagicItem((await params).id);
  return { title: item ? `${item.nome} — Oggetti magici — Il Grimorio.App` : "Oggetto non trovato" };
}

export default async function MagicItemPage({ params }: { params: Promise<{ id: string }> }) {
  const item = findMagicItem((await params).id);
  if (!item) notFound();
  return (
    <article className="space-y-5 px-4 pb-8 pt-4 sm:px-6">
      <BackButton fallback={LIST} label="Tutti gli oggetti magici" />
      <MagicItemSheet item={item} edition="2024" />
    </article>
  );
}
