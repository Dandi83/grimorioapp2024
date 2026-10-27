import Link from "next/link";

import { AdminLogin } from "@/components/admin-login";
import { SectionSwitches } from "@/components/sections/section-switches";
import { isAdmin } from "@/lib/admin-auth";
import { PUBLIC_SECTIONS, partId, type SectionPart } from "@/lib/public-sections";
import { allSectionStates } from "@/lib/section-visibility";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sezioni dell’app — Il Grimorio.App", robots: { index: false, follow: false } };

export default async function SectionsPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  // Sections and parts never switched have no row: visible.
  const states = await allSectionStates();
  return (
    <div className="mx-auto flex max-w-2xl lg:max-w-[1200px] flex-col gap-3 px-4 pb-28 pt-4">
      <Link href="/admin" className="inline-flex min-h-11 items-center self-start text-[15px] font-bold text-primary">‹ Amministrazione</Link>
      <SectionSwitches sections={PUBLIC_SECTIONS.map(section => ({
        key: section.key, title: section.title, where: section.where, state: states[section.key] ?? "visibile",
        parts: (section.parts as readonly SectionPart[]).map(part => ({ id: partId(section.key, part.key), title: part.title, group: part.group, state: states[partId(section.key, part.key)] ?? "visibile" })),
      }))} />
    </div>
  );
}
