import type { ReactNode } from "react";
import Link from "next/link";
import { Backpack, BarChart3, Bell, BookOpen, ChevronLeft, ChevronRight, Crown, Eye, Flag, FlaskConical, Gem, Hammer, HeartPulse, History, LogOut, Shield, Skull, Sparkles, Sword, type LucideIcon } from "lucide-react";

import { logoutAction } from "@/app/actions/admin";
import { AdminEditionSwitch } from "@/components/admin-edition/edition-bar";
import { AdminLogin } from "@/components/admin-login";
import { isAdmin } from "@/lib/admin-auth";
import { EDITION_BAND, spellEdition } from "@/lib/admin-edition";
import { adminEdition } from "@/lib/admin-edition-server";
import { CONTENT_SECTIONS } from "@/lib/content-sections";
import { allOverrides } from "@/lib/content-overrides";
import { countNewFeedback } from "@/lib/feedback";
import { countProposalsToReview } from "@/lib/homebrew";
import { PUBLIC_SECTIONS, effectiveHidden, type PublicSectionKey } from "@/lib/public-sections";
import { hiddenPartIds, sectionStates } from "@/lib/section-visibility";
import { listDevices } from "@/lib/push";
import { getAllMonsters } from "@/lib/monsters";
import { getAdminSpells } from "@/lib/spells";
import { usesLegacyMonsterRules } from "@/lib/srd-monsters";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Amministrazione — Grimorio",
  robots: { index: false, follow: false },
};

/** The contents of the chosen edition, in this order; Manuale only where the section has the edition (2024). */
const CONTENT_ORDER = ["incantesimi", "mostri", "classi", "condizioni", "oggetti-magici", "armi", "armature", "avventura", "strumenti", "manuale"] as const;

/** Icon of each row (all different) and the public section it shows or hides. */
const ROW_ICONS: Record<string, { Icon: LucideIcon; section?: PublicSectionKey }> = {
  incantesimi: { Icon: Sparkles, section: "incantesimi" },
  mostri: { Icon: Skull, section: "bestiario" },
  classi: { Icon: Crown, section: "classi" },
  condizioni: { Icon: HeartPulse, section: "condizioni" },
  "oggetti-magici": { Icon: Gem, section: "oggetti-magici" },
  armi: { Icon: Sword, section: "armi" },
  armature: { Icon: Shield, section: "armature" },
  avventura: { Icon: Backpack, section: "avventura" },
  strumenti: { Icon: Hammer, section: "strumenti" },
  manuale: { Icon: BookOpen },
};

type RowState = "nascosta" | "parti" | undefined;

/** A number with its noun: «1 dispositivo», «3 dispositivi». */
const many = (count: number, one: string, more: string) => `${count} ${count === 1 ? one : more}`;

/**
 * One row of a group: a single link at least 56 px high, the icon, the name on one line (with the
 * «Nascosta» or «Parti nascoste» pill under it), then the number, the state or the bordeaux pill, and the arrow.
 */
function Row({ href, name, Icon, count, status, pill, hidden }: {
  href: string;
  name: string;
  Icon: LucideIcon;
  count?: number | null;
  status?: string;
  pill?: string;
  hidden?: RowState;
}) {
  // One name for screen readers (and the tests): «Incantesimi · 319», «Segnalazioni · 2 nuove», «Classi · 12 · Parti nascoste».
  const label = [name, pill ?? (typeof count === "number" ? String(count) : status), hidden === "nascosta" ? "Nascosta" : hidden === "parti" ? "Parti nascoste" : undefined].filter(Boolean).join(" · ");
  return (
    <li>
      <Link href={href} aria-label={label} className="flex min-h-14 items-center gap-3 px-4 py-2 focus-visible:outline-[3px] focus-visible:-outline-offset-[3px] focus-visible:outline-primary">
        <Icon size={22} strokeWidth={1.8} color="#7A1F2B" className="shrink-0" aria-hidden="true" />
        {/* Name and value on one line; on a narrow phone a long value goes under the name, still on the right. */}
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="min-w-0">
            <span className="block whitespace-nowrap font-serif text-[19px] font-bold leading-tight text-foreground">{name}</span>
            {hidden === "nascosta" && <span className="mt-1 inline-block rounded-[6px] bg-[#2B2118] px-1.5 text-[11px] font-bold leading-4 text-[#E0A21A]">Nascosta</span>}
            {hidden === "parti" && <span className="mt-1 inline-block rounded-[6px] border border-[#2B2118] px-1.5 text-[11px] font-bold leading-[14px] text-[#2B2118]">Parti nascoste</span>}
          </span>
          {pill ? <span className="ml-auto whitespace-nowrap rounded-full bg-primary px-2.5 py-0.5 text-[14px] font-bold tabular-nums text-primary-foreground">{pill}</span>
            : typeof count === "number" ? <span className="ml-auto text-[16px] font-semibold tabular-nums text-muted">{count}</span>
            : status ? <span className="ml-auto whitespace-nowrap text-[14px] text-muted">{status}</span> : null}
        </span>
        <ChevronRight size={18} strokeWidth={2.2} className="shrink-0 text-[#B9A57C]" aria-hidden="true" />
      </Link>
    </li>
  );
}

/** A group: small spaced capital label, one cream box with the rows separated by a thin line. */
function Group({ id, label, color, className = "", children }: { id: string; label: string; color?: string; className?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={className}>
      <h2 id={id} className="px-1 pb-2 text-[13px] font-bold uppercase tracking-[0.12em] text-muted" style={color ? { color } : undefined}>{label}</h2>
      <ul className="divide-y divide-divider overflow-hidden rounded-[16px] border-[1.5px] border-border bg-card">{children}</ul>
    </section>
  );
}

export default async function AdminPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  const [newReports, overrides, states, parts] = await Promise.all([
    countNewFeedback().catch(() => null), allOverrides().catch(() => null), sectionStates().catch(() => null), hiddenPartIds().catch(() => [] as string[]),
  ]);
  const edition = await adminEdition();
  const [devices, spells, monsters, proposals] = await Promise.all([
    listDevices().then(list => list.length).catch(() => null),
    getAdminSpells().catch(() => null),
    getAllMonsters().catch(() => null),
    countProposalsToReview().catch(() => null),
  ]);
  // Entries of the chosen edition: the same rule as the lists they open (and as the public site).
  const spellCount = spells?.filter(spell => spellEdition(spell) === edition).length ?? null;
  const monsterCount = monsters?.filter(monster => (usesLegacyMonsterRules(monster) ? "2014" : "2024") === edition).length ?? null;
  // «Nascosta» for the sections hidden from the public (also through all their editions or blocks),
  // «Parti nascoste» when only some parts are (/admin/sezioni).
  const hiddenSections = effectiveHidden(states ? PUBLIC_SECTIONS.filter(section => states[section.key]).map(section => section.key) : [], parts);
  const rowState = (key: string): RowState => {
    const section = ROW_ICONS[key]?.section;
    if (!section) return undefined;
    if (hiddenSections.includes(section)) return "nascosta";
    return parts.some(id => id.startsWith(`${section}:`)) ? "parti" : undefined;
  };
  const active = overrides?.filter(row => !row.annullata_il && row.edizione === edition) ?? [];
  const band = EDITION_BAND[edition];
  const contents = CONTENT_ORDER.flatMap((key): { key: string; href: string; name: string; count: number | null }[] => {
    if (key === "incantesimi") return [{ key, href: "/admin/incantesimi", name: "Incantesimi", count: spellCount }];
    if (key === "mostri") return [{ key, href: "/admin/mostri", name: "Mostri", count: monsterCount }];
    const section = CONTENT_SECTIONS.find(item => item.key === key);
    return section && section.editions.includes(edition) ? [{ key, href: `/admin/contenuti/${key}`, name: section.title, count: section.items(edition).length }] : [];
  });
  const hiddenStatus = [
    hiddenSections.length ? many(hiddenSections.length, "sezione nascosta", "sezioni nascoste") : "",
    parts.length ? many(parts.length, "parte nascosta", "parti nascoste") : "",
  ].filter(Boolean).join(" · ") || "tutto visibile";
  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 pb-8 pt-3 lg:max-w-[1200px]">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-[15px] font-semibold text-primary focus-visible:outline-2 focus-visible:outline-primary">
          <ChevronLeft size={18} strokeWidth={2.4} aria-hidden="true" /> Torna al sito
        </Link>
        <form action={logoutAction}>
          <button type="submit" className="-mr-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-[15px] text-muted focus-visible:outline-2 focus-visible:outline-primary">
            <LogOut size={16} aria-hidden="true" /> Esci
          </button>
        </form>
      </div>
      <h1 className="mt-1 font-serif text-[36px] font-bold leading-tight text-primary">Amministrazione</h1>
      <AdminEditionSwitch key={edition} edition={edition} className="-mx-4 px-4" />
      {/* Phone and tablet: Da fare, Contenuti, Gestione. Computer: Contenuti on the left, the other two on the right. */}
      <div className="mt-2 grid gap-6 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-8">
        <Group id="gruppo-da-fare" label="Da fare" className="lg:col-start-2 lg:row-start-1">
          <Row href="/admin/segnalazioni" name="Segnalazioni" Icon={Flag}
            pill={newReports ? `${newReports} ${newReports === 1 ? "nuova" : "nuove"}` : undefined} status={newReports === null ? undefined : "nessuna nuova"} />
          <Row href="/admin/proposte" name="Proposte homebrew" Icon={FlaskConical}
            pill={proposals ? `${proposals} da vedere` : undefined} status={proposals === null ? undefined : "nessuna da vedere"} />
        </Group>
        <Group id="gruppo-contenuti" label={`Contenuti ${edition}`} color={band.background} className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
          {contents.map(item => <Row key={item.key} href={item.href} name={item.name} Icon={ROW_ICONS[item.key].Icon} count={item.count} hidden={rowState(item.key)} />)}
        </Group>
        <Group id="gruppo-gestione" label="Gestione · tutte le edizioni" className="lg:col-start-2 lg:row-start-2">
          <Row href="/admin/sezioni" name="Sezioni dell’app" Icon={Eye} status={states ? hiddenStatus : undefined} />
          <Row href="/admin/notifiche" name="Notifiche" Icon={Bell} status={devices === null ? undefined : many(devices, "dispositivo", "dispositivi")} />
          <Row href="/admin/registro" name="Registro modifiche" Icon={History} status={overrides ? many(active.length, "manuale", "manuali") : undefined} />
          <Row href="/admin/statistiche" name="Statistiche" Icon={BarChart3} />
        </Group>
      </div>
    </div>
  );
}
