"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, BookOpen, Eye, History, House, ListChecks, LogOut, type LucideIcon } from "lucide-react";

import { logoutAction } from "@/app/actions/admin";

/** The side menu of the reserved area, on a computer only (on a phone the Home leads everywhere). */
export function AdminSideNav({ due, unread }: { due: number; unread: number }) {
  const pathname = usePathname() ?? "/admin";
  const items: { href: string; label: string; Icon: LucideIcon; count?: number; match: (path: string) => boolean }[] = [
    { href: "/admin", label: "Area riservata", Icon: House, match: path => path === "/admin" },
    { href: "/admin#da-fare", label: "Da fare", Icon: ListChecks, count: due, match: () => false },
    { href: "/admin/contenuti", label: "Contenuti", Icon: BookOpen, match: path => /^\/admin\/(contenuti|incantesimi|mostri|srd-modificate|nomi-da-rivedere)(\/|$)/.test(path) },
    { href: "/admin/statistiche", label: "Statistiche", Icon: BarChart3, match: path => path.startsWith("/admin/statistiche") },
    { href: "/admin/sezioni", label: "Sezioni", Icon: Eye, match: path => path.startsWith("/admin/sezioni") },
    { href: "/admin/registro", label: "Registro", Icon: History, match: path => path.startsWith("/admin/registro") },
    { href: "/admin/notifiche", label: "Notifiche", Icon: Bell, count: unread, match: path => /^\/admin\/(notifiche|segnalazioni|proposte)(\/|$)/.test(path) },
  ];
  return (
    <nav aria-label="Area riservata" data-admin-side-nav="" className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-[#DDCFAE] bg-[#FFFBF0] px-3 py-4 lg:flex">
      <Link href="/" className="mb-3 px-3 font-serif text-[20px] font-bold text-[#2B2118]">Il Grimorio<span className="text-[#7A1F2B]">.App</span></Link>
      {items.map(({ href, label, Icon, count, match }) => {
        const active = match(pathname);
        return (
          <Link key={label} href={href} prefetch={false} aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-[12px] px-3 text-[15px] font-semibold ${active ? "bg-[#7A1F2B] text-[#FFFBF0]" : "text-[#2B2118] hover:bg-[#F6EFDF]"}`}>
            <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
            <span className="flex-1">{label}</span>
            {!!count && <span className={`rounded-full px-2 text-[12px] font-bold leading-5 ${active ? "bg-[#FFFBF0] text-[#7A1F2B]" : "bg-[#FCEFD0] text-[#7A4E00]"}`}>{count}</span>}
          </Link>
        );
      })}
      <div className="mt-auto flex flex-col gap-1 border-t border-[#DDCFAE] pt-3">
        <Link href="/" className="flex min-h-11 items-center px-3 text-[14px] text-[#5E4E3E]">‹ Torna al sito</Link>
        <form action={logoutAction}>
          <button type="submit" className="flex min-h-11 w-full items-center gap-2 px-3 text-[14px] text-[#5E4E3E]"><LogOut size={16} aria-hidden="true" /> Esci</button>
        </form>
      </div>
    </nav>
  );
}
