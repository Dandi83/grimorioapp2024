import { JsonLd } from "@/components/seo/json-ld";
import { pageMetadata, websiteLd } from "@/lib/seo";
import Image from "next/image";
import Link from "next/link";
import { Lock } from "lucide-react";

import { HomeSearch } from "@/components/search/home-search";
import { EditionPill } from "@/components/edition/edition-pill";
import { FirstLaunch } from "@/components/edition/first-launch";
import { HomeExtras } from "@/components/home/home-extras";
import { AdminStrip } from "@/components/home/admin-strip";
import { CupIcon } from "@/components/support/cup-icon";
import { SupportLink } from "@/components/support/support-link";
import { supportUrl } from "@/lib/support";
import { HomeShortcuts, type HomeShortcut } from "@/components/edition/home-shortcuts";
import { getMonsterListIndex } from "@/lib/monster-index";
import { collectionOf } from "@/lib/monsters-types";
import { EDITIONS, partId, soonHref, type Edition } from "@/lib/public-sections";
import { partsOut, sectionView, sectionsOut, visibleCards } from "@/lib/section-view";
import { getSpellIndex } from "@/lib/spell-index";
import styles from "./home.module.css";

export const revalidate = 300;

export const metadata = pageMetadata({
  name: "Il Grimorio.App", path: "/", title: "Il Grimorio.App — Incantesimi, mostri e regole di D&D 5e in italiano",
  description: "Consulta, cerca e filtra incantesimi, mostri, oggetti magici e regole di D&D 5e in italiano, edizioni 2014 e 2024. Gratis, anche offline.",
});

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
  // «In arrivo»: the shortcut stays, attenuated, without the number, to the «in costruzione» page.
  const { soon } = await sectionView();
  const entry = (key: "incantesimi" | "bestiario", shortcut: HomeShortcut): HomeShortcut[] =>
    !out.includes(key) ? [shortcut] : soon.includes(key) ? [{ href: soonHref(key), label: shortcut.label, soon: true }] : [];
  return [
    ...entry("incantesimi", { href: "/grimorio", label: "Incantesimi", section: "incantesimi", counts: spellCounts }),
    ...entry("bestiario", { href: "/bestiario", label: "Bestiario", section: "bestiario", counts: monsterCounts }),
    { href: "/compendio", label: "Compendio" },
  ];
}

export default async function HomePage() {
  const links = await shortcuts();
  const support = !!supportUrl();
  return (
    <div className={styles.home}>
      {/* PROMPT 45: the site and its search (/?cerca=…) for Google. */}
      <JsonLd data={websiteLd()} />
      <header className={styles.header}>
        <div className={styles.logo}>
          Il Grimorio<span>.App</span>
        </div>
        <nav className={styles.headerLinks} aria-label="Area riservata">
          {/* No prefetch: visitors almost never open the reserved area, and its page is never cached. */}
          <Link href="/admin" prefetch={false}><Lock size={16} strokeWidth={2} aria-hidden="true" />Area riservata</Link>
        </nav>
      </header>
      {/* The administrator only, drawn in the browser after the session check (PROMPT 18): nothing in this cached HTML. */}
      <AdminStrip />

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
        <EditionPill place="home" size="large" className={styles.edition} />
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
          {/* Computer: under the shortcuts (phones and tablets: under the picture). */}
          <HomeExtras className={styles.extrasWide} support={support} />
        </div>
      </section>
      <HomeExtras className={styles.extras} support={support} />
      {/* Phones and tablets: the legal pages, one small link above the bar (computers: in the side column). */}
      {/* «Sostieni il Grimorio» on the left when the Ko-fi address is set (lib/support.ts), the legal pages on the right. */}
      <p className={styles.info}>
        <SupportLink enabled={support} from="home" className={styles.support}><CupIcon size={18} />Sostieni il Grimorio</SupportLink>
        <Link href="/info" prefetch={false}>Info e note legali</Link>
      </p>
      <FirstLaunch />
    </div>
  );
}
