import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookMarked, KeyRound, Sparkles } from "lucide-react";
import { getAllMonsters } from "@/lib/monsters";
import { isSrdAnimal } from "@/lib/monsters-types";
import styles from "./home.module.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "GrimorioApp — Il sapere, oltre la soglia",
  description: "Entra nel Grimorio: esplora il Bestiario, scopri mostri e animali e ritrova le tue schede preferite. Il tuo compendio fantasy in italiano.",
};

export default async function HomePage() {
  const monsters = await getAllMonsters();
  const animalsCount = monsters.filter(isSrdAnimal).length;
  const monstersCount = monsters.length - animalsCount;
  return (
    <div className={styles.home}>
      <header className={styles.masthead}>
        <span className={styles.wordmark}>GrimorioApp</span>
        <span className={styles.edition}>Il tuo compendio<br />fantasy · 5e</span>
      </header>
      <div className={styles.portalScene} aria-hidden="true">
        <div className={styles.outerHalo} /><div className={styles.innerHalo} />
        <div className={styles.portalArch}><div className={styles.portalDoor} /><Sparkles className={styles.portalSigil} strokeWidth={1} /></div>
        <div className={styles.steps} /><div className={styles.groundLight} />
      </div>
      <section className={styles.welcome} aria-labelledby="home-title">
        <p className={styles.eyebrow}>Oltre la soglia</p>
        <h1 id="home-title" className={styles.title}>Ogni avventura<br />comincia qui.</h1>
        <p className={styles.intro}>Creature, segreti e conoscenza.<br />Il tuo mondo, a portata di mano.</p>
        <Link href="/bestiario" className={styles.primaryLink}>Entra nel Bestiario <ArrowUpRight size={20} aria-hidden="true" /></Link>
        <div className={styles.collections} aria-label="Le raccolte del Bestiario">
          <Link href="/bestiario?raccolta=mostri">{monstersCount} mostri</Link><span aria-hidden="true">·</span><Link href="/bestiario?raccolta=animali">{animalsCount} animali</Link>
        </div>
        <Link href="/preferiti" className={styles.favoritesLink}>
          <BookMarked size={20} strokeWidth={1.4} aria-hidden="true" />
          <span>Le tue pagine preziose<small>Ritrova le schede che hai salvato</small></span><ArrowRight size={18} aria-hidden="true" />
        </Link>
        <p className={styles.motto}>Il sapere è la più potente delle magie.</p>
      </section>
      {process.env.VERCEL_ENV === "preview" && (
        <section className={styles.preview} aria-label="Funzioni in anteprima">
          <p>In anteprima</p>
          <div><Link href="/manuale">Manuale <ArrowUpRight size={15} aria-hidden="true" /></Link><Link href="/personaggi">I miei personaggi <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
        </section>
      )}
      <footer className={styles.footer}>
        <p>* Progetto fan-made a scopo hobbistico. Nessuna affiliazione, sponsorizzazione o approvazione da parte di Wizards of the Coast o dei detentori dei marchi originali. Tutti i marchi registrati appartengono ai rispettivi proprietari.</p>
        <nav aria-label="Collegamenti del sito"><Link href="/fonti">Fonti e licenze</Link><Link href="/admin"><KeyRound size={13} aria-hidden="true" /> Area riservata</Link></nav>
      </footer>
    </div>
  );
}
