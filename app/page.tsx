import Image from "next/image";
import Link from "next/link";

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
          src="/hero-atmosfera.png"
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
    </div>
  );
}
