"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen } from "lucide-react";

import { EQUIPMENT_SECTIONS, isHiddenPath } from "@/lib/public-sections";

/** The 404 page: «Sezione momentaneamente non disponibile» for the pages of a hidden section. */
export function NotFoundView({ hidden }: { hidden: string[] }) {
  const pathname = usePathname();
  // The Equipaggiamento hub is unavailable when its four sections are all hidden.
  const unavailable = isHiddenPath(pathname, hidden) || (pathname === "/equipaggiamento" && EQUIPMENT_SECTIONS.every(key => hidden.includes(key)));
  return (
    <div className="flex flex-col items-center px-6 pb-10 pt-16 text-center">
      <span className="grid size-16 place-items-center rounded-full border-2 border-primary bg-primary-faint text-primary">
        <BookOpen size={30} aria-hidden="true" />
      </span>
      <h1 className="mt-5 font-serif text-[30px] font-bold leading-tight">
        {unavailable ? "Sezione momentaneamente non disponibile" : "Pagina non trovata"}
      </h1>
      <p className="mt-3 max-w-sm text-[16px] leading-6 text-muted">
        {unavailable
          ? "Ci stiamo lavorando. Torna a trovarci tra un po': il link che hai aperto funzionerà di nuovo."
          : "L’indirizzo che hai aperto non corrisponde a nessuna pagina del Grimorio."}
      </p>
      <Link href="/" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-[14px] bg-primary px-6 text-[16px] font-bold text-primary-foreground">
        Torna alla Home
      </Link>
    </div>
  );
}
