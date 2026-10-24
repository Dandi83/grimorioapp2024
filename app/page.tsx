import Image from "next/image";
import Link from "next/link";
import { Lock } from "lucide-react";

import { HomeSearch } from "@/components/search/home-search";
import { EditionPill } from "@/components/edition/edition-pill";
import { FirstLaunch } from "@/components/edition/first-launch";
import { HomeShortcuts, type HomeShortcut } from "@/components/edition/home-shortcuts";
import { getMonsterListIndex } from "@/lib/monster-index";
import { collectionOf } from "@/lib/monsters-types";
import { EDITIONS, partId, type Edition } from "@/lib/public-sections";
import { partsOut, sectionsOut, visibleCards } from "@/lib/section-view";
import { getSpellIndex } from "@/lib/spell-index";
import styles from "./home.module.css";

export const revalidate = 300;

/**
 * Shortcuts of the computer Home, with the number of cards the visitor can open in each edition
 * (hidden collections and cards left out); the page shows those of «la tua edizione».
 */
async function shortcuts(): Promise<HomeShortcut[]> {
  const [spells, monsters, out, parts] = await Promise.all([
    getSpellIndex().catch(() => []).then(list => visibleCards("incantesimo", list)),
    getMonsterListIndex().catch(() => []).then(list => visibleCards("mostro", list)),
    sectionsOut(), partsOut(),
  ]);
  const perEdition = (count: (edition: Edition) => number) => Object.fromEntries(EDITIONS.map(edition => [edition, count(edition)])) as Record<Edition, number>;
  const spellCounts = perEdition(edition => spells.filter(spell => (spell.edizione === "2014" ? "2014" : "2024") === edition).length);
  // A homebrew «Entrambe» counts in both editions.
  const monsterCounts = perEdition(edition => monsters.filter(monster => (monster.edizione === edition || monster.entrambe)
    && !parts.includes(partId("bestiario", collectionOf(monster)))).length);
  return [
    ...(out.includes("incantesimi") ? [] : [{ href: "/grimorio", label: "Incantesimi", section: "incantesimi", counts: spellCounts }]),
    ...(out.includes("bestiario") ? [] : [{ href: "/bestiario", label: "Bestiario", section: "bestiario", counts: monsterCounts }]),
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
        <nav className={styles.headerLinks} aria-label="Area riservata">
          <Link href="/admin"><Lock size={16} strokeWidth={2} aria-hidden="true" />Area riservata</Link>
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
        {/* Phones and tablets; on computers the pill is in the side column. */}
        <EditionPill place="home" className={styles.edition} />
        <div className={styles.copy}>
          <h1 id="home-quote" className={styles.quote}>
            Il sapere è la più
            <br />
            potente delle <em>magie.</em>
          </h1>
          <HomeSearch />
          {/* Computer only (home.module.css): the quick ways into the catalog, with the real numbers. */}
          <nav className={styles.shortcuts} aria-label="Scorciatoie">
            <HomeShortcuts links={links} />
          </nav>
        </div>
      </section>
      {/* Phones and tablets: the legal pages, one small link above the bar (computers: in the side column). */}
      <p className={styles.info}><Link href="/info">Info e note legali</Link></p>
      <FirstLaunch />
    </div>
  );
}
