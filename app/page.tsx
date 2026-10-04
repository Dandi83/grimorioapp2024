import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";

import { getAllSpells, computeMeta, levelLabel } from "@/lib/spells";
import { schoolColor } from "@/lib/school-colors";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const meta = computeMeta(await getAllSpells());
  const levels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div>
      {/* Hero */}
      <header className="relative h-[380px] overflow-hidden">
        <Image
          src="/hero-atmosfera.png"
          alt=""
          fill
          priority
          sizes="(max-width: 672px) 100vw, 672px"
          className="object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(10,10,11,0.4), rgba(10,10,11,0.75), rgba(10,10,11,1))",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 p-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-primary">
            5e24
          </p>
          <h1 className="font-serif text-5xl font-bold tracking-tight text-foreground">
            GrimorioApp
          </h1>
          <p className="mb-6 mt-2 font-serif text-base italic text-card-foreground text-balance">
            &ldquo;Il sapere è la più potente delle magie.&rdquo;
          </p>
          <Link
            href="/grimorio"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Search size={18} />
            Cerca un incantesimo
          </Link>
        </div>
      </header>

      {/* Scuole di Magia */}
      <section className="mt-8">
        <h2 className="mb-4 px-6 font-serif text-2xl font-bold text-foreground">
          Scuole di Magia
        </h2>
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-6 pb-1">
          {meta.scuole.map((s) => (
            <Link
              key={s}
              href={`/grimorio?scuola=${encodeURIComponent(s)}`}
              className="flex flex-shrink-0 items-center gap-2 rounded-xl border bg-card px-5 py-3 transition-opacity hover:opacity-80"
              style={{ borderColor: schoolColor(s) }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: schoolColor(s) }}
              />
              <span className="text-sm font-semibold text-foreground">{s}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Livelli */}
      <section className="mt-8">
        <h2 className="mb-4 px-6 font-serif text-2xl font-bold text-foreground">
          Livelli
        </h2>
        <div className="grid grid-cols-3 gap-3 px-6">
          {levels.map((n) => (
            <Link
              key={n}
              href={`/grimorio?livello=${n}`}
              className="flex aspect-[1.2] flex-col items-center justify-center rounded-xl border border-border bg-card transition-opacity hover:opacity-80"
            >
              <span className="font-serif text-3xl font-bold text-primary">
                {n}
              </span>
              <span className="mt-1 text-[11px] uppercase tracking-wider text-muted">
                {n === 0 ? "Trucchetti" : "Livello"}
              </span>
              <span className="sr-only">{levelLabel(n)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <footer className="mx-6 mt-12 border-t border-divider pt-4">
        <p className="text-center text-[10px] italic leading-4 tracking-wide text-muted">
          * Progetto fan-made a scopo puramente personale e non commerciale.
          Nessuna affiliazione, sponsorizzazione o approvazione da parte di
          Wizards of the Coast o dei detentori dei marchi originali. Tutti i
          marchi registrati appartengono ai rispettivi proprietari.
        </p>
      </footer>
    </div>
  );
}
