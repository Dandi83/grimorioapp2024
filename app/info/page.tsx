import Link from "next/link";
import { BookOpen, ChevronRight, FileText, MessageSquare, ShieldCheck, type LucideIcon } from "lucide-react";

export const metadata = { title: "Info e note legali — Il Grimorio.App" };

/** The legal pages, one large tile each (the whole row is the link). */
const TILES: { href: string; title: string; line: string; Icon: LucideIcon }[] = [
  { href: "/termini", title: "Termini d’uso", line: "Come si usa l’app, creature proposte e segnalazioni", Icon: FileText },
  { href: "/fonti", title: "Fonti e licenze", line: "SRD 5.2.1 e 5.1, licenza CC-BY, crediti", Icon: BookOpen },
  { href: "/privacy", title: "Privacy", line: "Statistiche, cookie e dati dei moduli", Icon: ShieldCheck },
  // The report form without a card: a problem of the app or an idea.
  { href: "/segnala", title: "Scrivici", line: "Un problema dell’app o un’idea, fuori dalle schede", Icon: MessageSquare },
];

/**
 * «Info e note legali», from the foot of the Home and of the side column. The exact attribution statements
 * stay word for word in /fonti: the line at the bottom only points there.
 */
export default function InfoPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 pb-8 pt-4 sm:px-6">
      <Link href="/" className="inline-flex min-h-11 items-center text-[15px] font-bold text-primary">‹ Home</Link>
      <h1 className="mt-1 font-serif text-[34px] font-bold leading-tight text-primary">Info e note legali</h1>
      <p className="mt-2 text-[16px] leading-snug text-muted">
        Il Grimorio.App è gratuito e non ufficiale. Qui trovi le regole d’uso, da dove vengono i contenuti e come trattiamo i dati.
      </p>
      <ul className="mt-5 flex flex-col gap-3">
        {TILES.map(({ href, title, line, Icon }) => (
          <li key={href}>
            <Link href={href} prefetch={false}
              className="flex min-h-[84px] items-center gap-4 rounded-[16px] border border-border bg-card px-4 py-3 shadow-[0_1px_0_var(--color-divider)] transition-colors hover:bg-elevated focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-amber">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-[#F2E8D2] text-primary">
                <Icon size={24} strokeWidth={1.9} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-serif text-[22px] font-bold leading-tight text-foreground">{title}</span>
                <span className="mt-0.5 block text-[14px] leading-snug text-muted">{line}</span>
              </span>
              <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 border-t border-divider pt-4 text-[14px] leading-6 text-muted">
        Compatibile con la quinta edizione. Le attribuzioni complete sono in{" "}
        <Link href="/fonti" className="font-semibold text-primary underline underline-offset-4">Fonti e licenze</Link>.
      </p>
    </article>
  );
}
