import Link from "next/link";

import { AdminLogin } from "@/components/admin-login";
import { SectionSwitches } from "@/components/sections/section-switches";
import { isAdmin } from "@/lib/admin-auth";
import { PUBLIC_SECTIONS, partId, type SectionPart } from "@/lib/public-sections";
import { hiddenPartIds, sectionStates } from "@/lib/section-visibility";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sezioni dell’app — Il Grimorio.App", robots: { index: false, follow: false } };

export default async function SectionsPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  const [states, parts] = await Promise.all([sectionStates(), hiddenPartIds()]);
  return (
    <div className="mx-auto flex max-w-2xl lg:max-w-[1200px] flex-col gap-3 px-4 pb-28 pt-4">
      <Link href="/admin" className="inline-flex min-h-11 items-center self-start text-[15px] font-bold text-primary">‹ Amministrazione</Link>
      <SectionSwitches sections={PUBLIC_SECTIONS.map(section => ({
        key: section.key, title: section.title, where: section.where, hidden: states[section.key],
        parts: (section.parts as readonly SectionPart[]).map(part => ({ id: partId(section.key, part.key), title: part.title, group: part.group, hidden: parts.includes(partId(section.key, part.key)) })),
      }))} />
    </div>
  );
}
