import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";

import styles from "./home.module.css";

export default function HomePage() {
  return (
    <div className={styles.home}>
      <header className={styles.header}>
        <div className={styles.logo}>
          Grimorio<span>App</span>
        </div>
        <Link href="/preferiti" className={styles.favorites}>
          Preferiti <Star size={18} aria-hidden="true" />
        </Link>
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
          <div className={styles.rule} aria-hidden="true" />
          <h1 id="home-quote" className={styles.quote}>
            Il sapere è la più
            <br />
            potente delle <em>magie.</em>
          </h1>
        </div>
      </section>

      <footer className={styles.adminCorner}>
        <Link href="/admin">Area riservata</Link>
      </footer>
    </div>
  );
}
