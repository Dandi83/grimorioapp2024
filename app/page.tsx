import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Swords } from "lucide-react";

import styles from "./home.module.css";

export default function HomePage() {
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
          sizes="(max-width: 672px) 100vw, 672px"
          className={styles.image}
        />
        <div className={styles.shade} aria-hidden="true" />
        <div className={styles.copy}>
          <h1 id="home-quote" className={styles.quote}>
            Il sapere è la più
            <br />
            potente delle <em>magie.</em>
          </h1>
        </div>
      </section>

      <nav aria-label="Sezioni" className={styles.sections}>
        <Link href="/equipaggiamento" className={styles.tile}>
          <span className={styles.tileIcon}><Swords size={26} aria-hidden="true" /></span>
          <span className={styles.tileText}>
            <span className={styles.tileTitle}>Equipaggiamento</span>
            <span className={styles.tileNote}>Armi e armature delle edizioni 2014 e 2024</span>
          </span>
          <ArrowRight size={20} aria-hidden="true" className={styles.tileArrow} />
        </Link>
      </nav>
    </div>
  );
}
