"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { BookOpen, Hammer } from "lucide-react";

import { EQUIPMENT_SECTIONS, isHiddenPath } from "@/lib/public-sections";

/** One of these under «Sezione momentaneamente in costruzione», a different one at every visit. */
export const UNDER_CONSTRUCTION = [
  "I nani della forgia ci stanno ancora lavorando. Tira iniziativa più tardi!",
  "Il mago ha lanciato Costruzione, ma l'incantesimo richiede concentrazione… e qualcuno l'ha disturbato.",
  "Pagina in fase di riposo lungo. Torna tra 8 ore (o forse prima).",
  "Il master sta ancora preparando questa sessione. Prendete pure gli snack.",
  "Un mimic ha preso il posto di questa pagina. La stiamo scacciando.",
  "Hai tirato 1 su Indagare: qui non c'è ancora niente… per ora!",
  "Gli gnomi artefici giurano che sarà pronta presto. Gli gnomi giurano molte cose.",
] as const;

/**
 * The 404 page: «Sezione momentaneamente in costruzione» for the pages of a hidden section or part (the eye of
 * /admin/sezioni), «Pagina non trovata» for the others. The page as served has the first sentence; the browser
 * picks one at random once the page is there, so the first render matches the HTML (no hydration error).
 */
let picked: number | undefined;
const pickSentence = () => (picked ??= Math.floor(Math.random() * UNDER_CONSTRUCTION.length));
const noChanges = () => () => {};

export function NotFoundView({ hidden }: { hidden: string[] }) {
  const pathname = usePathname();
  // The server and the hydration use the first sentence, then the one picked in this browser for this load.
  const sentence = useSyncExternalStore(noChanges, pickSentence, () => 0);
  // The Equipaggiamento hub is unavailable when its four sections are all hidden.
  const unavailable = isHiddenPath(pathname, hidden) || (pathname === "/equipaggiamento" && EQUIPMENT_SECTIONS.every(key => hidden.includes(key)));
  return (
    <div className="flex flex-col items-center px-6 pb-10 pt-16 text-center">
      <span className="grid size-16 place-items-center rounded-full border-2 border-primary bg-primary-faint text-primary">
        {unavailable ? <Hammer size={30} aria-hidden="true" /> : <BookOpen size={30} aria-hidden="true" />}
      </span>
      <h1 className="mt-5 font-serif text-[30px] font-bold leading-tight">
        {unavailable ? "Sezione momentaneamente in costruzione" : "Pagina non trovata"}
      </h1>
      <p className="mt-3 max-w-sm text-[16px] leading-6 text-muted" data-under-construction={unavailable ? sentence : undefined}>
        {unavailable
          ? UNDER_CONSTRUCTION[sentence]
          : "L’indirizzo che hai aperto non corrisponde a nessuna pagina del Grimorio."}
      </p>
      <Link href="/" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-[14px] bg-primary px-6 text-[16px] font-bold text-primary-foreground">
        Torna alla Home
      </Link>
    </div>
  );
}
