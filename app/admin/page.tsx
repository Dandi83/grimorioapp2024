import Link from "next/link";
import { LogOut } from "lucide-react";

import { logoutAction } from "@/app/actions/admin";
import { AdminLogin } from "@/components/admin-login";
import { AdminPublicLink } from "@/components/admin-public-link";
import { isAdmin } from "@/lib/admin-auth";
import { CONTENT_SECTIONS } from "@/lib/content-sections";
import { allOverrides } from "@/lib/content-overrides";
import { countNewFeedback } from "@/lib/feedback";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Amministrazione — Grimorio",
  robots: { index: false, follow: false },
};

/** Sections not yet editable here (PR C2): shown so the map of the admin area is complete. */
const COMING = [
  { title: "Armature", hint: "CA, requisiti" },
  { title: "Equipaggiamento", hint: "Avventura e strumenti" },
  { title: "Oggetti magici", hint: "Testi e tabelle" },
  { title: "Condizioni", hint: "Testi 2014/2024" },
  { title: "Manuale", hint: "Voci e regole" },
];

function Tile({ href, title, hint, count }: { href?: string; title: string; hint: string; count?: number }) {
  const body = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className="font-serif text-xl font-bold text-primary">{title}</span>
        {count ? <span className="rounded-[10px] bg-amber px-2 py-0.5 text-[11px] font-bold text-foreground">{count}</span> : null}
      </span>
      <span className="mt-0.5 block text-[13px] text-muted">{href ? hint : "In arrivo"}</span>
    </>
  );
  return href ? (
    <Link href={href} className="block min-h-[76px] rounded-[14px] border-[1.5px] border-border bg-card p-3.5">{body}</Link>
  ) : (
    <div aria-disabled="true" className="min-h-[76px] rounded-[14px] border-[1.5px] border-dashed border-border bg-card/60 p-3.5 opacity-70">{body}</div>
  );
}

export default async function AdminPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  const [newReports, overrides] = await Promise.all([countNewFeedback().catch(() => null), allOverrides().catch(() => null)]);
  const active = overrides?.filter(row => !row.annullata_il) ?? [];
  const perSection = (key: string) => active.filter(row => row.sezione === key).length;
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 pb-8 pt-4">
      <div className="flex items-center justify-between gap-3">
        <AdminPublicLink />
        <form action={logoutAction}>
          <button type="submit" className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted">
            <LogOut className="h-4 w-4" aria-hidden="true" /> Esci
          </button>
        </form>
      </div>
      <h1 className="font-serif text-[30px] font-bold text-primary">Amministrazione</h1>
      <div className="flex gap-2">
        <Link href="/admin/segnalazioni" className="flex-1 rounded-[14px] bg-primary p-3 text-sm text-primary-foreground">
          <b className="block text-[22px]">{newReports ?? "—"}</b>{newReports === 1 ? "segnalazione nuova" : "segnalazioni nuove"}
        </Link>
        <Link href="/admin/registro" className="flex-1 rounded-[14px] border-[1.5px] border-border bg-card p-3 text-sm">
          <b className="block text-[22px] text-primary">{overrides ? active.length : "—"}</b>{active.length === 1 ? "modifica manuale" : "modifiche manuali"}
        </Link>
      </div>
      <nav aria-label="Sezioni da modificare" className="grid grid-cols-2 gap-2.5">
        <Tile href="/admin/incantesimi" title="Incantesimi" hint="Modifica testi e dati" />
        <Tile href="/admin/mostri" title="Mostri" hint="Modifica schede" />
        {CONTENT_SECTIONS.map(section => <Tile key={section.key} href={`/admin/contenuti/${section.key}`} title={section.title} hint={section.hint} count={perSection(section.key)} />)}
        {COMING.filter(item => !CONTENT_SECTIONS.some(section => section.title === item.title)).map(item => <Tile key={item.title} title={item.title} hint={item.hint} />)}
      </nav>
      <nav aria-label="Altro" className="flex flex-wrap gap-2">
        {[["/admin/sezioni", "Sezioni dell’app"], ["/admin/segnalazioni", "Segnalazioni"], ["/admin/registro", "Registro modifiche"], ["/admin/statistiche", "Statistiche"]].map(([href, label]) => (
          <Link key={href} href={href} className="inline-flex min-h-11 items-center rounded-[22px] border-[1.5px] border-chip-border bg-card px-3.5 text-sm font-semibold text-primary">{label}</Link>
        ))}
      </nav>
    </div>
  );
}
