import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminContentList } from "@/components/admin-content/content-list";
import { AdminLogin } from "@/components/admin-login";
import { isAdmin } from "@/lib/admin-auth";
import { activeOverrideMap } from "@/lib/content-overrides-apply";
import { allOverrides } from "@/lib/content-overrides";
import { isContentEdition, sectionSpec } from "@/lib/content-sections";

export const dynamic = "force-dynamic";
export const metadata = { title: "Modifica contenuti — Il Grimorio.App", robots: { index: false, follow: false } };

export default async function ContentSectionPage({ params, searchParams }: {
  params: Promise<{ sezione: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await isAdmin())) return <AdminLogin />;
  const section = sectionSpec((await params).sezione);
  if (!section) notFound();
  const requested = (await searchParams).edizione;
  const edition = isContentEdition(requested) && section.editions.includes(requested) ? requested : section.editions[0];
  const active = [...activeOverrideMap((await allOverrides()).filter(row => row.sezione === section.key && row.edizione === edition)).values()];
  const changed = new Set(active.map(row => row.scheda_id));
  const items = section.items(edition).map(item => ({ ...item, modificato: changed.has(item.id) }));
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 pb-8 pt-4">
      <Link href="/admin" className="inline-flex min-h-11 items-center self-start text-[15px] font-bold text-primary">‹ Amministrazione</Link>
      <h1 className="font-serif text-[30px] font-bold text-primary">{section.title}</h1>
      {section.editions.length > 1 && (
        <nav aria-label="Edizione" className="flex gap-1 rounded-xl bg-elevated p-1">
          {section.editions.map(value => (
            <Link key={value} href={`/admin/contenuti/${section.key}?edizione=${value}`} aria-current={value === edition ? "page" : undefined}
              className={`flex min-h-11 flex-1 items-center justify-center rounded-[9px] font-bold tabular-nums ${value === edition ? "bg-primary text-primary-foreground" : "text-muted"}`}>
              {value}
            </Link>
          ))}
        </nav>
      )}
      <AdminContentList section={section.key} edition={edition} items={items} />
    </div>
  );
}
