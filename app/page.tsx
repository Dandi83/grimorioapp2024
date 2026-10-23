import Image from "next/image";
import Link from "next/link";

import { HomeSearch } from "@/components/search/home-search";
import { getMonsterListIndex } from "@/lib/monster-index";
import { isSrdAnimal } from "@/lib/monsters-types";
import { partId } from "@/lib/public-sections";
import { partsOut, sectionsOut, visibleCards } from "@/lib/section-view";
import { getSpellIndex } from "@/lib/spell-index";
import styles from "./home.module.css";

export const revalidate = 300;

/** Shortcuts of the computer Home, with the number of cards the visitor can open (hidden editions, collections and cards left out). */
async function shortcuts() {
  const [spells, monsters, out, parts] = await Promise.all([
    getSpellIndex().catch(() => []).then(list => visibleCards("incantesimo", list)),
    getMonsterListIndex().catch(() => []).then(list => visibleCards("mostro", list)),
    sectionsOut(), partsOut(),
  ]);
  const spellCount = spells.filter(spell => !parts.includes(partId("incantesimi", spell.edizione === "2014" ? "2014" : "2024"))).length;
  const monsterCount = monsters.filter(monster => !parts.includes(partId("bestiario", monster.edizione))
    && !parts.includes(partId("bestiario", isSrdAnimal(monster) ? "animali" : "mostri"))).length;
  return [
    ...(out.includes("incantesimi") ? [] : [{ href: "/grimorio", label: `Incantesimi · ${spellCount}` }]),
    ...(out.includes("bestiario") ? [] : [{ href: "/bestiario", label: `Bestiario · ${monsterCount}` }]),
    { href: "/compendio", label: "Compendio" },
  ];
}

export default async function HomePage() {
  const links = await shortcuts();
  return (
    <div className={styles.home}>
      <header className={styles.header}>
        <div className={styles.logo}>
          Il Grimorio<span>.App</span>
        </div>
        <nav className={styles.headerLinks} aria-label="Area riservata e informazioni legali">
          <Link href="/admin">Area riservata</Link>
          <Link href="/fonti">Termini e condizioni</Link>
        </nav>
      </header>

      <section className={styles.library} aria-labelledby="home-quote">
        <Image
          src="/hero-atmosfera.webp"
          alt="Antica biblioteca con scaffali di libri e una scala a chiocciola"
          fill
          priority
          sizes="(max-width: 672px) 100vw, (max-width: 1023px) 896px, calc(100vw - 240px)"
          className={styles.image}
        />
        <div className={styles.shade} aria-hidden="true" />
        <div className={styles.copy}>
          <h1 id="home-quote" className={styles.quote}>
            Il sapere è la più
            <br />
            potente delle <em>magie.</em>
          </h1>
          <HomeSearch />
          {/* Computer only (home.module.css): the quick ways into the catalog, with the real numbers. */}
          <nav className={styles.shortcuts} aria-label="Scorciatoie">
            {links.map(link => <Link key={link.href} href={link.href} prefetch={false}>{link.label}</Link>)}
          </nav>
          <Link href="/segnala" prefetch={false} className={styles.report}>Segnala un errore o un consiglio</Link>
        </div>
      </section>
    </div>
  );
}
