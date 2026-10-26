import { notFound } from "next/navigation";

import { UnderConstruction } from "@/components/sections/section-unavailable";
import { soonTitle } from "@/lib/public-sections";
import { sectionView } from "@/lib/section-view";

export const metadata = { title: "In arrivo — Il Grimorio.App", robots: { index: false, follow: false } };

/**
 * Where the entries of a section or part «In arrivo» lead (/admin/sezioni): «Sezione momentaneamente in
 * costruzione» with the pill «<name> · In arrivo». Nothing of its content. Not found when it is not «In arrivo».
 */
export default async function SoonPage({ params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  const title = soonTitle(id);
  const { soon } = await sectionView();
  if (!title || !soon.includes(id)) notFound();
  return <UnderConstruction soon={title} />;
}
